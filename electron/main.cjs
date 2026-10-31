const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  shell,
  dialog,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let isPinnedToDesktop = true;
let zOrderHelper = null;
let mainHwndString = null;
let wallpaperWatcher = null;

const STATE_FILE = path.join(app.getPath('userData'), 'deskgrid-layout-v5.json');

/**
 * Starts a persistent PowerShell Win32 helper that keeps DeskGrid's HWND
 * at HWND_BOTTOM (the Desktop layer behind normal apps).
 * NOTE: It NEVER touches, hides, or modifies Windows' native desktop icons!
 */
function startDesktopZOrderHelper() {
  if (process.platform !== 'win32') return;
  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DeskGridWin32 {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@
$HWND_BOTTOM = [IntPtr]::new(1)
$FLAGS = 0x0001 -bor 0x0002 -bor 0x0010 # SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE
while ($null -ne ($line = [Console]::In.ReadLine())) {
  try {
    $cmd = $line.Trim()
    $hwnd = [IntPtr]::new([long]$cmd)
    [DeskGridWin32]::SetWindowPos($hwnd, $HWND_BOTTOM, 0, 0, 0, 0, $FLAGS) | Out-Null
  } catch {}
}
`;
  try {
    zOrderHelper = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psScript],
      { stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true }
    );
    zOrderHelper.on('error', () => {
      zOrderHelper = null;
    });
  } catch (_) {
    zOrderHelper = null;
  }
}

function setNativeDesktopIconsVisible(visible) {
  // No-op: never hide or touch Windows desktop icons
}

function sendWindowToDesktopBottom() {
  if (!mainWindow || mainWindow.isDestroyed() || !isPinnedToDesktop) return;
  try {
    if (!mainHwndString) {
      const buf = mainWindow.getNativeWindowHandle();
      mainHwndString =
        buf.length === 8 ? buf.readBigUInt64LE(0).toString() : buf.readUInt32LE(0).toString();
    }
    if (zOrderHelper && zOrderHelper.stdin && !zOrderHelper.stdin.destroyed) {
      zOrderHelper.stdin.write(mainHwndString + '\n');
    }
  } catch (_) {}
}

/**
 * Reads the user's current Windows Desktop Wallpaper (Registry path or TranscodedWallpaper) as a Data URL
 * so DeskGrid acts as the true desktop surface and completely covers raw desktop icons underneath.
 */
function getWindowsWallpaperDataUrl() {
  try {
    let bestFile = null;
    let bestMtime = 0;

    // 1. Check Registry HKCU\Control Panel\Desktop\Wallpaper
    try {
      const { execSync } = require('child_process');
      const regOut = execSync('reg query "HKCU\\Control Panel\\Desktop" /v Wallpaper', {
        encoding: 'utf8',
        timeout: 800,
        windowsHide: true,
      });
      const match = regOut.match(/Wallpaper\s+REG_SZ\s+(.*)/i);
      if (match && match[1]) {
        const regPath = match[1].trim();
        if (fs.existsSync(regPath)) {
          const st = fs.statSync(regPath);
          if (st.isFile()) {
            bestFile = regPath;
            bestMtime = st.mtimeMs;
          }
        }
      }
    } catch (_) {}

    // 2. Check TranscodedWallpaper in Themes
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const transcoded = path.join(appData, 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper');
    if (fs.existsSync(transcoded)) {
      try {
        const st = fs.statSync(transcoded);
        if (st.isFile() && st.mtimeMs >= bestMtime) {
          bestFile = transcoded;
          bestMtime = st.mtimeMs;
        }
      } catch (_) {}
    }

    // 3. Check CachedFiles in Themes
    const cachedDir = path.join(appData, 'Microsoft', 'Windows', 'Themes', 'CachedFiles');
    if (fs.existsSync(cachedDir) && fs.statSync(cachedDir).isDirectory()) {
      try {
        const files = fs
          .readdirSync(cachedDir)
          .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
        for (const file of files) {
          const p = path.join(cachedDir, file);
          const st = fs.statSync(p);
          if (st.isFile() && st.mtimeMs > bestMtime) {
            bestFile = p;
            bestMtime = st.mtimeMs;
          }
        }
      } catch (_) {}
    }

    if (bestFile && fs.existsSync(bestFile)) {
      const buf = fs.readFileSync(bestFile);
      const ext = path.extname(bestFile).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  } catch (_) {}
  return null;
}

/**
 * Detects if an active animated wallpaper video exists in Lively Wallpaper or mpv.exe
 */
function getActiveLivelyWallpaperVideo() {
  try {
    const candidateDirs = [];

    // Dynamically search Windows Store Packages for any LivelyWallpaper installation
    const packagesDir = path.join(process.env.LOCALAPPDATA, 'Packages');
    if (fs.existsSync(packagesDir)) {
      try {
        const pkgs = fs.readdirSync(packagesDir).filter((d) => d.toLowerCase().includes('livelywallpaper'));
        for (const pkg of pkgs) {
          candidateDirs.push(path.join(packagesDir, pkg, 'LocalCache', 'Local', 'Lively Wallpaper'));
        }
      } catch (_) {}
    }
    candidateDirs.push(path.join(process.env.LOCALAPPDATA, 'Lively Wallpaper'));

    for (const baseDir of candidateDirs) {
      if (!fs.existsSync(baseDir)) continue;
      const layoutFile = path.join(baseDir, 'WallpaperLayout.json');
      if (fs.existsSync(layoutFile)) {
        const layout = JSON.parse(fs.readFileSync(layoutFile, 'utf8'));
        if (Array.isArray(layout) && layout.length > 0) {
          const screen = layout.find((s) => s.LivelyScreen?.IsPrimary) || layout[0];
          let infoPath = screen.LivelyInfoPath;
          if (infoPath) {
            if (!fs.existsSync(infoPath)) {
              const rel = infoPath.replace(/^.*?[\\/]Lively Wallpaper[\\/]/i, '');
              const remapped = path.join(baseDir, rel);
              if (fs.existsSync(remapped)) infoPath = remapped;
            }
            const infoJsonPath = path.join(infoPath, 'LivelyInfo.json');
            if (fs.existsSync(infoJsonPath)) {
              const info = JSON.parse(fs.readFileSync(infoJsonPath, 'utf8'));
              if (info.FileName && fs.existsSync(info.FileName)) {
                const normPath = info.FileName.replace(/\\/g, '/');
                const fileUrl = 'file:///' + encodeURI(normPath).replace(/#/g, '%23');
                return {
                  ok: true,
                  videoPath: info.FileName,
                  fileUrl,
                  title: info.Title || path.basename(info.FileName, path.extname(info.FileName)),
                };
              }
            }
          }
        }
      }
    }
  } catch (_) {}

  // Fallback: Check running mpv.exe process command line
  try {
    const { execSync } = require('child_process');
    const out = execSync(
      'powershell -NoProfile -NonInteractive -Command "$mpv = Get-CimInstance Win32_Process -Filter \\"Name = \'mpv.exe\'\\" -ErrorAction SilentlyContinue | Select-Object -First 1; if ($mpv -and $mpv.CommandLine -match \'\\\"([^\\\"]+\\.(mp4|webm|mkv))\\\"\') { Write-Output $Matches[1] }"',
      { encoding: 'utf8', timeout: 1500, windowsHide: true }
    ).trim();
    if (out && fs.existsSync(out)) {
      const normPath = out.replace(/\\/g, '/');
      const fileUrl = 'file:///' + encodeURI(normPath).replace(/#/g, '%23');
      return {
        ok: true,
        videoPath: out,
        fileUrl,
        title: path.basename(out, path.extname(out)),
      };
    }
  } catch (_) {}

  return null;
}

let lastWallpaperDataUrl = null;

function checkAndBroadcastWallpaperChange() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const current = getWindowsWallpaperDataUrl();
  if (current && current !== lastWallpaperDataUrl) {
    lastWallpaperDataUrl = current;
    mainWindow.webContents.send('deskgrid:wallpaper-changed', current);
  }
}

/**
 * Watch Windows Themes directory and poll registry for live wallpaper changes from Windows Personalization Settings
 */
function setupWallpaperWatcher() {
  try {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const themesDir = path.join(appData, 'Microsoft', 'Windows', 'Themes');
    lastWallpaperDataUrl = getWindowsWallpaperDataUrl();

    if (fs.existsSync(themesDir)) {
      let debounceTimer = null;
      wallpaperWatcher = fs.watch(themesDir, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkAndBroadcastWallpaperChange, 350);
      });
    }

    // Also poll every 2.5 seconds to immediately catch wallpaper changes made via Windows Personalization Settings
    setInterval(checkAndBroadcastWallpaperChange, 2500);
  } catch (_) {}
}

/**
 * Load app icon from assets/deskgrid.ico or fallback to generated buffer
 */
function getAppIcon() {
  const icoPath = path.join(__dirname, '../assets/deskgrid.ico');
  if (fs.existsSync(icoPath)) {
    const img = nativeImage.createFromPath(icoPath);
    if (!img.isEmpty()) return img;
  }
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      buf[idx] = 248;
      buf[idx + 1] = 189;
      buf[idx + 2] = 56;
      buf[idx + 3] = 255;
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

/**
 * Resolve all Desktop directories on Windows (including redirected OneDrive Desktop, Shell Folders, and Public)
 */
function getDesktopDirectories() {
  const dirs = new Set();

  // 1. Query Registry for redirected Desktop path (handles OneDrive Desktop, Domain profiles, localized names)
  try {
    const { execSync } = require('child_process');
    const out = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders" /v Desktop',
      { encoding: 'utf8', timeout: 800, windowsHide: true }
    );
    const m = out.match(/Desktop\s+REG_\w+\s+(.*)/i);
    if (m && m[1]) {
      let regDesktop = m[1].trim();
      if (process.env.USERPROFILE) {
        regDesktop = regDesktop.replace(/%USERPROFILE%/i, process.env.USERPROFILE);
      }
      if (fs.existsSync(regDesktop)) dirs.add(regDesktop);
    }
  } catch (_) {}

  // 2. Electron's native desktop path
  try {
    const electronDesktop = app.getPath('desktop');
    if (electronDesktop && fs.existsSync(electronDesktop)) dirs.add(electronDesktop);
  } catch (_) {}

  // 3. User home Desktop
  const homeDesktop = path.join(os.homedir(), 'Desktop');
  if (fs.existsSync(homeDesktop)) dirs.add(homeDesktop);

  // 4. Common Public Desktop (where installers put system-wide shortcuts)
  if (process.env.PUBLIC) {
    const pubDesktop = path.join(process.env.PUBLIC, 'Desktop');
    if (fs.existsSync(pubDesktop)) dirs.add(pubDesktop);
  }
  try {
    const { execSync } = require('child_process');
    const out = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders" /v "Common Desktop"',
      { encoding: 'utf8', timeout: 800, windowsHide: true }
    );
    const m = out.match(/Common Desktop\s+REG_\w+\s+(.*)/i);
    if (m && m[1] && fs.existsSync(m[1].trim())) {
      dirs.add(m[1].trim());
    }
  } catch (_) {}

  // 5. Check any OneDrive folders in user profile
  try {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const entries = fs.readdirSync(userProfile, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.toLowerCase().startsWith('onedrive')) {
        const odDesktop = path.join(userProfile, entry.name, 'Desktop');
        if (fs.existsSync(odDesktop)) dirs.add(odDesktop);
      }
    }
  } catch (_) {}

  return Array.from(dirs);
}

/**
 * Map known desktop apps to our crisp vector brand icon keys when needed
 */
function detectCustomIconKey(name, targetPath = '') {
  const lower = `${name} ${targetPath}`.toLowerCase();
  if (lower.includes('vmware')) return 'vmware';
  if (lower.includes('mysql')) return 'mysql';
  if (lower.includes('docker')) return 'docker';
  if (lower.includes('oracle')) return 'oracle';
  if (lower.includes('hackerrank')) return 'hackerrank';
  if (lower.includes('leetcode')) return 'leetcode';
  if (lower.includes('codeforces')) return 'codeforces';
  if (lower.includes('visual studio code') || lower.includes('code.exe')) return 'vscode';
  if (lower.includes('antigravity')) return 'antigravity';
  if (lower.includes('kimi')) return 'kimi';
  if (lower.includes('github')) return 'github';
  if (lower.includes('git bash') || lower.includes('git-bash')) return 'gitbash';
  if (lower.includes('vercel')) return 'vercel';
  if (lower.includes('asphalt')) return 'asphalt';
  if (lower.includes('epic games')) return 'epic';
  if (lower.includes('modrinth')) return 'modrinth';
  if (lower.includes('minecraft')) return 'minecraft';
  if (lower.includes('rockstar')) return 'rockstar';
  if (lower.includes('instagram')) return 'instagram';
  if (lower.includes('javascript') || lower.includes('.js')) return 'js';
  if (lower.includes('udemy')) return 'udemy';
  if (lower.includes('classroom')) return 'classroom';
  if (lower.includes('sheets')) return 'sheets';
  if (lower.includes('vlc')) return 'vlc';
  if (lower.includes('microsoft edge') || lower.includes('msedge.exe')) return 'edge';
  if (lower.includes('google chrome') || lower.includes('chrome.exe')) return 'chrome';
  return undefined;
}

/**
 * Categorize a desktop entry into one of the user's signature drawers
 */
function categorizeDesktopItem(item) {
  if (item.isDirectory) {
    return 'Folders';
  }
  const lower = (item.name + ' ' + (item.targetPath || '')).toLowerCase();
  const ext = (item.extension || '').toLowerCase();

  if (/vmware|virtualbox|mysql|postgres|mongodb|docker|oracle|redis|dbeaver|sql|wsl/.test(lower)) {
    return 'DB and VMs';
  }
  if (/antigravity|kimi|claude|chatgpt|openai|ollama|cursor|copilot|gemini|vercel|github|git bash/.test(lower)) {
    return 'AI';
  }
  if (/visual studio|vscode|intellij|pycharm|eclipse|sublime|postman|hackerrank|leetcode|codeforces/.test(lower)) {
    return 'coding';
  }
  if (/steam|epic games|rockstar|minecraft|asphalt|modrinth|riot|valorant|ubisoft|xbox/.test(lower)) {
    return 'GAMES';
  }
  if (/instagram|whatsapp|discord|telegram|slack|zoom|teams|spotify|twitter|linkedin/.test(lower)) {
    return 'socials';
  }
  if (/udemy|coursera|classroom|canvas|blackboard|sheets|anki|notion|obsidian|onenote/.test(lower)) {
    return 'study';
  }
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.zip', '.rar', '.7z'].includes(ext)) {
    return 'Files & Documents';
  }
  return 'Programs';
}

/**
 * Extract accurate high-resolution icon for shortcuts, applications, documents, and system items
 */
async function extractAccurateIcon(fullPath, isDirectory, linkTarget = '', linkIcon = '') {
  if (isDirectory) {
    if (fullPath && fs.existsSync(fullPath)) {
      try {
        const icon = await app.getFileIcon(fullPath, { size: 'large' });
        if (icon && !icon.isEmpty()) return icon.toDataURL();
      } catch (_) {}
    }
    return null; // Render golden Windows 11 folder SVG
  }

  // 1. Direct explicit .ico or .png file specified in shortcut metadata
  const cleanIconPath = (linkIcon || '').replace(/,\s*-?\d+$/, '').trim();
  if (cleanIconPath && fs.existsSync(cleanIconPath)) {
    const iconExt = path.extname(cleanIconPath).toLowerCase();
    if (iconExt === '.ico') {
      try {
        const buf = fs.readFileSync(cleanIconPath);
        if (buf.length > 0) return `data:image/x-icon;base64,${buf.toString('base64')}`;
      } catch (_) {}
    }
    if (iconExt === '.png' || iconExt === '.jpg') {
      try {
        const buf = fs.readFileSync(cleanIconPath);
        return `data:image/png;base64,${buf.toString('base64')}`;
      } catch (_) {}
    }
    try {
      const icon = await app.getFileIcon(cleanIconPath, { size: 'large' });
      if (icon && !icon.isEmpty()) return icon.toDataURL();
    } catch (_) {}
  }

  // 2. Primary: Extract directly from fullPath using Windows Shell (handles .lnk, .exe, .pdf, .docx, and shell: namespaces)
  if (fullPath && (fullPath.startsWith('shell:') || fs.existsSync(fullPath))) {
    try {
      const iconPromise = app.getFileIcon(fullPath, { size: 'large' });
      const timeoutPromise = new Promise((r) => setTimeout(() => r(null), 3000));
      const icon = await Promise.race([iconPromise, timeoutPromise]);
      if (icon && !icon.isEmpty()) {
        return icon.toDataURL();
      }
    } catch (_) {}
  }

  // 3. Fallback: If shortcut target is an .exe that exists on disk
  if (linkTarget && fs.existsSync(linkTarget)) {
    try {
      const iconPromise = app.getFileIcon(linkTarget, { size: 'large' });
      const timeoutPromise = new Promise((r) => setTimeout(() => r(null), 3000));
      const icon = await Promise.race([iconPromise, timeoutPromise]);
      if (icon && !icon.isEmpty()) {
        return icon.toDataURL();
      }
    } catch (_) {}
  }

  // 4. Fallback: If cleanIconPath points to a .dll or executable resource
  if (cleanIconPath && fs.existsSync(cleanIconPath)) {
    try {
      const iconPromise = app.getFileIcon(cleanIconPath, { size: 'large' });
      const timeoutPromise = new Promise((r) => setTimeout(() => r(null), 3000));
      const icon = await Promise.race([iconPromise, timeoutPromise]);
      if (icon && !icon.isEmpty()) {
        return icon.toDataURL();
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Scan Windows Desktop + Downloads folders and return categorized items with real icons
 */
async function scanWindowsDesktop() {
  const dirs = getDesktopDirectories();
  const seenNames = new Set();
  const rawCandidates = [];

  const systemBuiltins = [
    {
      id: 'sys-network',
      name: 'Network',
      fullPath: 'shell:NetworkPlacesFolder',
      isDirectory: false,
      isShortcut: false,
      isSystem: true,
      systemIconType: 'network',
      category: 'Programs',
    },
    {
      id: 'sys-recycle-bin',
      name: 'Recycle Bin',
      fullPath: 'shell:RecycleBinFolder',
      isDirectory: false,
      isShortcut: false,
      isSystem: true,
      systemIconType: 'recycle-bin',
      category: 'Programs',
    },
    {
      id: 'sys-this-pc',
      name: 'This PC',
      fullPath: 'shell:MyComputerFolder',
      isDirectory: false,
      isShortcut: false,
      isSystem: true,
      systemIconType: 'this-pc',
      category: 'Programs',
    },
    {
      id: 'sys-control-panel',
      name: 'Control Panel',
      fullPath: 'shell:ControlPanelFolder',
      isDirectory: false,
      isShortcut: false,
      isSystem: true,
      systemIconType: 'control-panel',
      category: 'Programs',
    },
  ];

  // Extract exact native Windows shell icons for built-in system items
  for (const b of systemBuiltins) {
    b.iconDataUrl = await extractAccurateIcon(b.fullPath, false);
  }

  for (const dir of dirs) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 60);
    } catch (_) {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.toLowerCase() === 'desktop.ini') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      const ext = path.extname(entry.name);
      const isShortcut = ext.toLowerCase() === '.lnk' || ext.toLowerCase() === '.url';
      const displayName = isShortcut ? path.basename(entry.name, ext) : entry.name;

      // Skip DeskGrid's own launcher shortcut on the desktop if desired, or keep in Programs
      const dedupeKey = displayName.toLowerCase().trim();
      if (seenNames.has(dedupeKey)) continue;
      seenNames.add(dedupeKey);

      let isDirectory = entry.isDirectory();
      let linkTarget = fullPath;
      let linkIcon = '';

      if (ext.toLowerCase() === '.lnk') {
        try {
          const link = shell.readShortcutLink(fullPath);
          if (link) {
            linkTarget = link.target || fullPath;
            linkIcon = link.icon || '';
            if (link.target && fs.existsSync(link.target)) {
              try {
                if (fs.statSync(link.target).isDirectory()) {
                  isDirectory = true;
                }
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      rawCandidates.push({
        fullPath,
        ext,
        isShortcut,
        displayName,
        isDirectory,
        linkTarget,
        linkIcon,
      });
    }
  }

  const items = await Promise.all(
    rawCandidates.map(async (c) => {
      const iconDataUrl = await extractAccurateIcon(
        c.fullPath,
        c.isDirectory,
        c.linkTarget,
        c.linkIcon
      );
      const customIconKey = detectCustomIconKey(c.displayName, c.linkTarget);
      const itemObj = {
        id: `item-${Buffer.from(c.fullPath).toString('base64').replace(/=/g, '').slice(-20)}`,
        name: c.displayName,
        fullPath: c.fullPath,
        targetPath: c.linkTarget,
        extension: c.ext.toLowerCase(),
        isDirectory: c.isDirectory,
        isShortcut: c.isShortcut,
        customIconKey,
        iconDataUrl,
      };
      itemObj.category = categorizeDesktopItem(itemObj);
      return itemObj;
    })
  );

  // Also scan Downloads folder (top 12 items in parallel)
  let downloadsItems = [];
  try {
    const downloadsDir = app.getPath('downloads');
    if (downloadsDir && fs.existsSync(downloadsDir)) {
      const dlEntries = fs
        .readdirSync(downloadsDir, { withFileTypes: true })
        .filter((e) => !e.name.startsWith('.') && e.name.toLowerCase() !== 'desktop.ini')
        .slice(0, 12);

      downloadsItems = await Promise.all(
        dlEntries.map(async (entry) => {
          const fullPath = path.join(downloadsDir, entry.name);
          const ext = path.extname(entry.name);
          const isDirectory = entry.isDirectory();
          const iconDataUrl = await extractAccurateIcon(fullPath, isDirectory);
          return {
            id: `dl-${Buffer.from(fullPath).toString('base64').replace(/=/g, '').slice(-20)}`,
            name: entry.name,
            fullPath,
            targetPath: fullPath,
            extension: ext.toLowerCase(),
            isDirectory,
            isShortcut: ext.toLowerCase() === '.lnk',
            iconDataUrl,
            category: 'Downloads',
          };
        })
      );
    }
  } catch (_) {}

  const filteredBuiltins = systemBuiltins.filter(
    (b) => !seenNames.has(b.name.toLowerCase().trim())
  );

  return {
    items: [...items, ...filteredBuiltins],
    downloadsItems,
  };
}

/**
 * Keep the window strictly within the primary display's workArea so the Windows Taskbar is NEVER covered
 */
function syncWindowToWorkArea() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  mainWindow.setBounds({ x, y, width, height });
  sendWindowToDesktopBottom();
  mainWindow.webContents.send('deskgrid:work-area-changed', { x, y, width, height });
}

function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    icon: getAppIcon(),
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    syncWindowToWorkArea();
    mainWindow.showInactive();
    sendWindowToDesktopBottom();
    checkAndBroadcastWallpaperChange();
  });

  // Whenever the user clicks on DeskGrid or switches windows, keep DeskGrid at HWND_BOTTOM
  // and check for wallpaper updates from Windows Settings
  mainWindow.on('focus', () => {
    sendWindowToDesktopBottom();
    checkAndBroadcastWallpaperChange();
  });

  mainWindow.on('show', () => {
    sendWindowToDesktopBottom();
  });

  mainWindow.on('minimize', (event) => {
    if (isPinnedToDesktop) {
      event.preventDefault();
      mainWindow.restore();
      sendWindowToDesktopBottom();
    }
  });

  screen.on('display-metrics-changed', () => syncWindowToWorkArea());
  screen.on('display-added', () => syncWindowToWorkArea());
  screen.on('display-removed', () => syncWindowToWorkArea());
}

function setupSystemTray() {
  const icon = getAppIcon();
  tray = new Tray(icon);
  tray.setToolTip('DeskGrid — Windows Desktop Drawer Manager');

  const updateTrayMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'DeskGrid Desktop Manager', enabled: false },
      { type: 'separator' },
      {
        label: isPinnedToDesktop
          ? '✓ Pinned to Desktop Layer (Behind Windows)'
          : 'Pin to Desktop Layer (Behind Windows)',
        click: () => {
          isPinnedToDesktop = !isPinnedToDesktop;
          if (isPinnedToDesktop) {
            sendWindowToDesktopBottom();
          } else if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
          updateTrayMenu();
        },
      },
      {
        label: mainWindow && mainWindow.isVisible() ? 'Switch to Original Desktop (Alt+D)' : 'Show DeskGrid Drawers (Alt+D)',
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) {
            mainWindow.hide();
            // icons untouched
          } else {
            // icons untouched
            syncWindowToWorkArea();
            mainWindow.showInactive();
            sendWindowToDesktopBottom();
          }
          updateTrayMenu();
        },
      },
      { type: 'separator' },
      {
        label: '+ Add New Drawer',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('deskgrid:tray-command', 'add-drawer');
          }
        },
      },
      {
        label: 'Level & Align All Drawers',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('deskgrid:tray-command', 'auto-align');
          }
        },
      },
      {
        label: 'Rescan Windows Desktop',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('deskgrid:tray-command', 'rescan');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit DeskGrid',
        click: () => app.quit(),
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateTrayMenu();
  tray.on('click', () => {
    if (!mainWindow) return;
    if (!mainWindow.isVisible()) {
      syncWindowToWorkArea();
      mainWindow.showInactive();
      sendWindowToDesktopBottom();
    }
    updateTrayMenu();
  });
}

// IPC Handlers
ipcMain.handle('deskgrid:get-work-area', () => {
  return screen.getPrimaryDisplay().workArea;
});

ipcMain.handle('deskgrid:get-wallpaper', () => {
  return getWindowsWallpaperDataUrl();
});

ipcMain.handle('deskgrid:get-active-lively-video', () => {
  return getActiveLivelyWallpaperVideo();
});

ipcMain.handle('deskgrid:wallpaper-action', async (_event, action) => {
  try {
    if (action === 'open-lively') {
      // Launch Lively Wallpaper (supports both Windows Store AppX & standard desktop installs)
      const psCmd = `
        $p = (Get-Process Lively -ErrorAction SilentlyContinue | Select-Object -First 1).Path
        if ($p -and (Test-Path $p)) {
          Start-Process -FilePath $p
        } else {
          $pkg = Get-AppxPackage *LivelyWallpaper* -ErrorAction SilentlyContinue | Select-Object -First 1
          if ($pkg) {
            $exe = Join-Path $pkg.InstallLocation "Build\\Lively.exe"
            if (Test-Path $exe) { Start-Process -FilePath $exe }
            else { explorer.exe ("shell:AppsFolder\\" + $pkg.PackageFamilyName + "!App") }
          } else {
            $local = Join-Path $env:LOCALAPPDATA "Programs\\Lively Wallpaper\\Lively.exe"
            if (Test-Path $local) { Start-Process -FilePath $local }
          }
        }
      `;
      exec(`powershell -NoProfile -WindowStyle Hidden -Command "${psCmd.replace(/\r?\n/g, '; ')}"`);
      return { ok: true };
    }

    if (action === 'windows-settings') {
      exec('explorer.exe ms-settings:personalization-background');
      return { ok: true };
    }

    if (action === 'toggle-native-icons') {
      try {
        const psToggle = `
$reg = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced'
$cur = (Get-ItemProperty -Path $reg -Name 'HideIcons' -ErrorAction SilentlyContinue).HideIcons
$nxt = if ($cur -eq 1) { 0 } else { 1 }
Set-ItemProperty -Path $reg -Name 'HideIcons' -Value $nxt
$sig = @'
using System;
using System.Runtime.InteropServices;
public class WinNotify {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
'@
Add-Type -TypeDefinition $sig
[WinNotify]::SHChangeNotify(0x08000000, 0x1000, [IntPtr]::Zero, [IntPtr]::Zero)
`;
        exec(`powershell.exe -NoProfile -NonInteractive -Command "${psToggle.replace(/\r?\n/g, ' ')}"`, { windowsHide: true });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }

    if (action === 'set-windows-wallpaper') {
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose Image for Windows System Wallpaper',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp'] }],
        properties: ['openFile'],
      });
      if (res.canceled || !res.filePaths[0]) return { ok: false };
      const chosenPath = res.filePaths[0];
      const imgPath = chosenPath.replace(/'/g, "''");
      const psSetWall = `
Add-Type @"
using System.Runtime.InteropServices;
public class WallSetter {
  [DllImport("user32.dll", CharSet = CharSet.Auto)]
  public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
[WallSetter]::SystemParametersInfo(20, 0, '${imgPath}', 3) | Out-Null
`;
      try {
        const { execSync } = require('child_process');
        execSync(`powershell -NoProfile -WindowStyle Hidden -Command "${psSetWall.replace(/\r?\n/g, ' ')}"`);
      } catch (_) {}

      const chosenBuf = fs.readFileSync(chosenPath);
      const ext = path.extname(chosenPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      const immediateDataUrl = `data:${mime};base64,${chosenBuf.toString('base64')}`;

      lastWallpaperDataUrl = immediateDataUrl;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deskgrid:wallpaper-changed', immediateDataUrl);
      }

      return { ok: true, dataUrl: immediateDataUrl };
    }

    if (action === 'pick-custom-media') {
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose Video (.mp4/.webm) or Image Wallpaper for DeskGrid',
        filters: [
          {
            name: 'Live Video or Image Wallpaper',
            extensions: ['mp4', 'webm', 'gif', 'jpg', 'jpeg', 'png', 'webp'],
          },
        ],
        properties: ['openFile'],
      });
      if (res.canceled || !res.filePaths[0]) return { ok: false };
      const chosen = res.filePaths[0];
      const ext = path.extname(chosen).toLowerCase();
      const isVideo = ext === '.mp4' || ext === '.webm';
      const fileUrl = `file:///${chosen.replace(/\\/g, '/')}`;
      return { ok: true, fileUrl, isVideo };
    }
  } catch (e) {
    return { ok: false, error: String(e) };
  }
  return { ok: false };
});

ipcMain.handle('deskgrid:scan-desktop', async () => {
  return await scanWindowsDesktop();
});

ipcMain.handle('deskgrid:get-icon', async (_event, itemPath) => {
  return await extractAccurateIcon(itemPath, false);
});

ipcMain.on('deskgrid:send-to-bottom', () => {
  sendWindowToDesktopBottom();
});

ipcMain.handle('deskgrid:open-item', async (_event, itemPath) => {
  if (!itemPath) return { ok: false };
  try {
    if (itemPath.startsWith('shell:')) {
      exec(`explorer.exe "${itemPath}"`);
      return { ok: true };
    }
    if (itemPath.startsWith('http://') || itemPath.startsWith('https://')) {
      await shell.openExternal(itemPath);
      return { ok: true };
    }
    const err = await shell.openPath(itemPath);
    if (err) {
      exec(`start "" "${itemPath}"`);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('deskgrid:show-in-folder', async (_event, itemPath) => {
  if (!itemPath || itemPath.startsWith('shell:')) return { ok: false };
  try {
    shell.showItemInFolder(itemPath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('deskgrid:pick-items', async (_event, options = {}) => {
  const mode = options.mode || 'files';
  const properties =
    mode === 'folder'
      ? ['openDirectory', 'multiSelections']
      : ['openFile', 'multiSelections', 'dontAddToRecent'];

  const result = await dialog.showOpenDialog(mainWindow, {
    title: mode === 'folder' ? 'Select Folders to Add to Drawer' : 'Select Shortcuts, Apps, or Files',
    properties,
  });

  if (result.canceled || !result.filePaths.length) {
    return [];
  }

  const picked = [];
  for (const fullPath of result.filePaths) {
    const ext = path.extname(fullPath);
    const isShortcut = ext.toLowerCase() === '.lnk' || ext.toLowerCase() === '.url';
    const name = isShortcut ? path.basename(fullPath, ext) : path.basename(fullPath);
    let isDirectory = false;
    try {
      isDirectory = fs.statSync(fullPath).isDirectory();
    } catch (_) {}
    const iconDataUrl = await extractAccurateIcon(fullPath, isDirectory);
    picked.push({
      id: `picked-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      fullPath,
      targetPath: fullPath,
      extension: ext.toLowerCase(),
      isDirectory,
      isShortcut,
      customIconKey: detectCustomIconKey(name, fullPath),
      iconDataUrl,
    });
  }
  return picked;
});

ipcMain.handle('deskgrid:load-state', async () => {
  try {
    // Clean up any legacy v3 / v4 state files that might lack proper icon extraction
    const oldV3 = path.join(app.getPath('userData'), 'deskgrid-layout-v3.json');
    if (fs.existsSync(oldV3)) {
      try { fs.unlinkSync(oldV3); } catch (_) {}
    }
    const oldV4 = path.join(app.getPath('userData'), 'deskgrid-layout-v4.json');
    if (fs.existsSync(oldV4)) {
      try { fs.unlinkSync(oldV4); } catch (_) {}
    }

    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      // Validate that saved state does NOT contain legacy mock items
      const hasMock = parsed?.blocks?.some((b) =>
        b.items?.some(
          (it) =>
            it.id?.startsWith('fb-') ||
            it.id?.startsWith('doc-') ||
            it.id?.startsWith('fd-') ||
            it.id === 'dl-fallback-1' ||
            it.name === 'VMware Workstation' ||
            it.name === 'HackerRank' ||
            it.name === 'Project_Specification.pdf'
        )
      );
      if (hasMock) {
        try { fs.unlinkSync(STATE_FILE); } catch (_) {}
        return null;
      }
      return parsed;
    }
  } catch (_) {}
  return null;
});

ipcMain.handle('deskgrid:save-state', async (_event, state) => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.on('deskgrid:set-click-through', (_event, ignore) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (ignore) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.handle('deskgrid:set-pin-mode', (_event, pinned) => {
  isPinnedToDesktop = Boolean(pinned);
  if (isPinnedToDesktop) sendWindowToDesktopBottom();
  return { isPinnedToDesktop };
});

ipcMain.handle('deskgrid:system-action', async (_event, action) => {
  switch (action) {
    case 'snip':
      exec('explorer.exe ms-screenclip:');
      break;
    case 'explorer':
      exec('explorer.exe');
      break;
    case 'control-panel':
      exec('control.exe');
      break;
    case 'task-manager':
      exec('taskmgr.exe');
      break;
    case 'settings':
      exec('explorer.exe ms-settings:');
      break;
    case 'downloads':
      shell.openPath(app.getPath('downloads'));
      break;
    default:
      break;
  }
  return { ok: true };
});

ipcMain.on('deskgrid:toggle-visibility', () => {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
    // icons untouched
  } else {
    // icons untouched
    syncWindowToWorkArea();
    mainWindow.showInactive();
    sendWindowToDesktopBottom();
  }
});

ipcMain.on('deskgrid:quit', () => {
  // icons untouched
  app.quit();
});

app.whenReady().then(() => {
  startDesktopZOrderHelper();
  createMainWindow();
  setupSystemTray();
  setupWallpaperWatcher();

  // Global shortcut: Alt+D (or Ctrl+Shift+D) toggles between DeskGrid and Original Windows Desktop
  const toggleDesktopView = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      // icons untouched
    } else {
      // icons untouched
      syncWindowToWorkArea();
      mainWindow.showInactive();
      sendWindowToDesktopBottom();
    }
  };

  try {
    globalShortcut.register('Alt+D', toggleDesktopView);
    globalShortcut.register('CommandOrControl+Shift+D', toggleDesktopView);
  } catch (_) {}
  // Ensure user has a desktop shortcut with our custom icon
  try {
    const desktopLnk = path.join(app.getPath('desktop'), 'DeskGrid.lnk');
    const icoPath = path.join(__dirname, '../assets/deskgrid.ico');
    const exePath = process.execPath;
    const projDir = path.resolve(__dirname, '..');
    const psShortcut = `
      $ws = New-Object -ComObject WScript.Shell;
      $lnk = '${desktopLnk.replace(/'/g, "''")}';
      if (-not (Test-Path $lnk)) {
        $s = $ws.CreateShortcut($lnk);
        $s.TargetPath = '${exePath.replace(/'/g, "''")}';
        $s.Arguments = '${projDir.replace(/'/g, "''")}';
        $s.WorkingDirectory = '${projDir.replace(/'/g, "''")}';
        $s.IconLocation = '${icoPath.replace(/'/g, "''")},0';
        $s.Description = 'DeskGrid Windows Desktop Manager';
        $s.Save();
      }
    `;
    exec(`powershell -NoProfile -WindowStyle Hidden -Command "${psShortcut.replace(/\r?\n/g, '; ')}"`);
  } catch (_) {}
});

app.on('before-quit', () => {
  // icons untouched
  try {
    globalShortcut.unregisterAll();
  } catch (_) {}
  if (zOrderHelper) {
    try {
      zOrderHelper.stdin.end();
    } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
