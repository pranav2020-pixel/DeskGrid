import { DesktopBlock, DesktopItem, ScheduleEntry } from '../types';

/**
 * Generates responsive initial layout coordinates scaled to the user's primary display workArea
 * (excluding the Windows Taskbar).
 */
export function buildDefaultBlocks(
  workWidth = 1536,
  workHeight = 824,
  scannedItems: DesktopItem[] = [],
  downloadsItems: DesktopItem[] = []
): DesktopBlock[] {
  const scaleX = workWidth / 1536;
  const scaleY = workHeight / 824;
  const sx = (v: number) => Math.round(v * scaleX);
  const sy = (v: number) => Math.round(v * scaleY);

  // Group scanned desktop items by category
  const byCategory: Record<string, DesktopItem[]> = {};
  for (const item of scannedItems) {
    const cat = item.category || 'Programs';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  }

  const getItemsOrFallback = (category: string, fallback: DesktopItem[]): DesktopItem[] => {
    // If the scanner found real user apps/shortcuts for this category, populate only their real items!
    if (scannedItems.length > 0) {
      return byCategory[category] || [];
    }
    // Only use demo mock items if running in a pure browser without Electron / without disk access
    return fallback;
  };

  return [
    {
      id: 'drawer-db-vms',
      title: 'DB and VMs',
      kind: 'drawer',
      x: sx(44),
      y: sy(59),
      width: sx(240),
      height: sy(248),
      opacity: 0.78,
      zIndex: 1,
      items: getItemsOrFallback('DB and VMs', [
        {
          id: 'fb-vmware',
          name: 'VMware Workstation',
          fullPath: 'C:\\Program Files (x86)\\VMware\\VMware Workstation\\vmware.exe',
          isShortcut: true,
          customIconKey: 'vmware',
        },
        {
          id: 'fb-mysql',
          name: 'MySQL Workbench',
          fullPath: 'C:\\Program Files\\MySQL\\MySQL Workbench 8.0 CE\\MySQLWorkbench.exe',
          isShortcut: true,
          customIconKey: 'mysql',
        },
        {
          id: 'fb-docker',
          name: 'Docker Desktop',
          fullPath: 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
          isShortcut: true,
          customIconKey: 'docker',
        },
        {
          id: 'fb-oracle',
          name: 'Oracle Cloud Infrastructure',
          fullPath: 'https://cloud.oracle.com',
          isShortcut: true,
          customIconKey: 'oracle',
        },
      ]),
    },
    {
      id: 'drawer-coding',
      title: 'coding',
      kind: 'drawer',
      x: sx(307),
      y: sy(59),
      width: sx(240),
      height: sy(248),
      opacity: 0.78,
      zIndex: 2,
      items: getItemsOrFallback('coding', [
        {
          id: 'fb-hackerrank',
          name: 'HackerRank',
          fullPath: 'https://www.hackerrank.com',
          isShortcut: true,
          customIconKey: 'hackerrank',
        },
        {
          id: 'fb-leetcode',
          name: "LeetCode - The World's...",
          fullPath: 'https://leetcode.com',
          isShortcut: true,
          customIconKey: 'leetcode',
        },
        {
          id: 'fb-codeforces',
          name: 'Codeforces',
          fullPath: 'https://codeforces.com',
          isShortcut: true,
          customIconKey: 'codeforces',
        },
        {
          id: 'fb-vscode',
          name: 'Visual Studio Code',
          fullPath: 'vscode://',
          isShortcut: true,
          customIconKey: 'vscode',
        },
      ]),
    },
    {
      id: 'drawer-ai',
      title: 'AI',
      kind: 'drawer',
      x: sx(580),
      y: sy(59),
      width: sx(240),
      height: sy(248),
      opacity: 0.78,
      zIndex: 3,
      items: getItemsOrFallback('AI', [
        {
          id: 'fb-agy',
          name: 'Antigravity',
          fullPath: 'https://idx.google.com',
          isShortcut: true,
          customIconKey: 'antigravity',
        },
        {
          id: 'fb-agy-ide',
          name: 'Antigravity IDE',
          fullPath: 'https://idx.google.com',
          isShortcut: true,
          customIconKey: 'antigravity',
        },
        {
          id: 'fb-kimi',
          name: 'Kimi',
          fullPath: 'https://kimi.moonshot.cn',
          isShortcut: true,
          customIconKey: 'kimi',
        },
        {
          id: 'fb-github',
          name: 'GitHub',
          fullPath: 'https://github.com',
          isShortcut: true,
          customIconKey: 'github',
        },
        {
          id: 'fb-gitbash',
          name: 'Git Bash',
          fullPath: 'C:\\Program Files\\Git\\git-bash.exe',
          isShortcut: true,
          customIconKey: 'gitbash',
        },
        {
          id: 'fb-vercel',
          name: 'Vercel',
          fullPath: 'https://vercel.com',
          isShortcut: true,
          customIconKey: 'vercel',
        },
      ]),
    },
    {
      id: 'drawer-games',
      title: 'GAMES',
      kind: 'drawer',
      x: sx(44),
      y: sy(328),
      width: sx(240),
      height: sy(320),
      opacity: 0.78,
      zIndex: 4,
      items: getItemsOrFallback('GAMES', [
        {
          id: 'fb-asphalt',
          name: 'Asphalt Legends',
          fullPath: 'shell:AppsFolder',
          isShortcut: true,
          customIconKey: 'asphalt',
        },
        {
          id: 'fb-epic',
          name: 'Epic Games Launcher',
          fullPath: 'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe',
          isShortcut: true,
          customIconKey: 'epic',
        },
        {
          id: 'fb-modrinth',
          name: 'Modrinth App',
          fullPath: 'https://modrinth.com',
          isShortcut: true,
          customIconKey: 'modrinth',
        },
        {
          id: 'fb-minecraft',
          name: 'Minecraft for Windows',
          fullPath: 'minecraft://',
          isShortcut: true,
          customIconKey: 'minecraft',
        },
        {
          id: 'fb-rockstar',
          name: 'Rockstar Games Lau...',
          fullPath: 'C:\\Program Files\\Rockstar Games\\Launcher\\Launcher.exe',
          isShortcut: true,
          customIconKey: 'rockstar',
        },
      ]),
    },
    {
      id: 'drawer-socials',
      title: 'socials',
      kind: 'drawer',
      x: sx(307),
      y: sy(328),
      width: sx(240),
      height: sy(320),
      opacity: 0.78,
      zIndex: 5,
      items: getItemsOrFallback('socials', [
        {
          id: 'fb-instagram',
          name: 'Instagram',
          fullPath: 'https://www.instagram.com',
          isShortcut: true,
          customIconKey: 'instagram',
        },
      ]),
    },
    {
      id: 'drawer-study',
      title: 'study',
      kind: 'drawer',
      x: sx(580),
      y: sy(328),
      width: sx(240),
      height: sy(320),
      opacity: 0.78,
      zIndex: 6,
      items: getItemsOrFallback('study', [
        {
          id: 'fb-notion',
          name: 'Notion',
          fullPath: 'https://www.notion.so',
          isShortcut: true,
        },
        {
          id: 'fb-udemy',
          name: 'Udemy',
          fullPath: 'https://www.udemy.com',
          isShortcut: true,
          customIconKey: 'udemy',
        },
        {
          id: 'fb-classroom',
          name: 'Google Classroom',
          fullPath: 'https://classroom.google.com',
          isShortcut: true,
          customIconKey: 'classroom',
        },
        {
          id: 'fb-sheets',
          name: 'Sheets',
          fullPath: 'https://docs.google.com/spreadsheets',
          isShortcut: true,
          customIconKey: 'sheets',
        },
      ]),
    },

    // Center Widgets Column
    {
      id: 'widget-calendar-main',
      title: 'Calendar & Schedule',
      kind: 'widget-calendar',
      x: sx(836),
      y: sy(59),
      width: sx(200),
      height: sy(304),
      opacity: 0.82,
      zIndex: 7,
      items: [],
    },
    {
      id: 'widget-tools-main',
      title: 'Quick Tools',
      kind: 'widget-tools',
      x: sx(836),
      y: sy(380),
      width: sx(200),
      height: sy(104),
      opacity: 0.82,
      zIndex: 8,
      items: [],
    },
    {
      id: 'widget-clock-main',
      title: 'Clock',
      kind: 'widget-clock',
      x: sx(836),
      y: sy(544),
      width: sx(96),
      height: sy(104),
      opacity: 0.82,
      zIndex: 9,
      items: [],
    },
    {
      id: 'widget-weather-main',
      title: 'Weather',
      kind: 'widget-weather',
      x: sx(940),
      y: sy(544),
      width: sx(96),
      height: sy(104),
      opacity: 0.9,
      zIndex: 10,
      items: [],
    },

    // Right Column Drawers
    {
      id: 'drawer-programs',
      title: 'Programs',
      kind: 'drawer',
      x: sx(1066),
      y: sy(16),
      width: sx(432),
      height: sy(208),
      opacity: 0.78,
      zIndex: 11,
      items: getItemsOrFallback('Programs', [
        {
          id: 'fb-vlc',
          name: 'VLC media player',
          fullPath: 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
          isShortcut: true,
          customIconKey: 'vlc',
        },
        {
          id: 'fb-edge',
          name: 'Microsoft Edge',
          fullPath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          isShortcut: true,
          customIconKey: 'edge',
        },
        {
          id: 'fb-chrome',
          name: 'Google Chrome',
          fullPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          isShortcut: true,
          customIconKey: 'chrome',
        },
        {
          id: 'sys-control-panel',
          name: 'Control Panel',
          fullPath: 'shell:ControlPanelFolder',
          isSystem: true,
          systemIconType: 'control-panel',
        },
        {
          id: 'sys-network',
          name: 'Network',
          fullPath: 'shell:NetworkPlacesFolder',
          isSystem: true,
          systemIconType: 'network',
        },
        {
          id: 'sys-recycle-bin',
          name: 'Recycle Bin',
          fullPath: 'shell:RecycleBinFolder',
          isSystem: true,
          systemIconType: 'recycle-bin',
        },
        {
          id: 'sys-this-pc',
          name: 'This PC',
          fullPath: 'shell:MyComputerFolder',
          isSystem: true,
          systemIconType: 'this-pc',
        },
      ]),
    },
    {
      id: 'drawer-folders',
      title: 'Folders',
      kind: 'drawer',
      x: sx(1066),
      y: sy(232),
      width: sx(432),
      height: sy(208),
      opacity: 0.78,
      zIndex: 12,
      items: getItemsOrFallback('Folders', [
        { id: 'fd-1', name: 'Projects', fullPath: 'shell:Personal', isDirectory: true },
        { id: 'fd-2', name: 'Documents', fullPath: 'shell:Personal', isDirectory: true },
        { id: 'fd-3', name: 'Source Code', fullPath: 'shell:Personal', isDirectory: true },
        { id: 'fd-4', name: 'Media', fullPath: 'shell:Personal', isDirectory: true },
        { id: 'fd-5', name: 'Work', fullPath: 'shell:Personal', isDirectory: true },
        { id: 'fd-6', name: 'Notes', fullPath: 'shell:Personal', isDirectory: true },
        { id: 'fd-7', name: 'Resources', fullPath: 'shell:Personal', isDirectory: true },
        { id: 'fd-8', name: 'Archive', fullPath: 'shell:Personal', isDirectory: true },
      ]),
    },
    {
      id: 'drawer-files',
      title: 'Files & Documents',
      kind: 'drawer',
      x: sx(1066),
      y: sy(456),
      width: sx(432),
      height: sy(200),
      opacity: 0.78,
      zIndex: 13,
      items: getItemsOrFallback('Files & Documents', [
        {
          id: 'doc-1',
          name: 'Project_Specification.pdf',
          fullPath: 'shell:Personal',
          extension: '.pdf',
        },
        {
          id: 'doc-2',
          name: 'Architecture_Design.docx',
          fullPath: 'shell:Personal',
          extension: '.docx',
        },
        {
          id: 'doc-3',
          name: 'Quarterly_Budget.xlsx',
          fullPath: 'shell:Personal',
          extension: '.xlsx',
        },
        {
          id: 'doc-4',
          name: 'Release_Assets.zip',
          fullPath: 'shell:Personal',
          extension: '.zip',
        },
      ]),
    },
    {
      id: 'drawer-downloads',
      title: 'Downloads',
      kind: 'drawer',
      x: sx(1066),
      y: sy(668),
      width: sx(432),
      height: sy(189),
      collapsed: true,
      expandedHeight: sy(189),
      isPortal: true,
      opacity: 0.85,
      zIndex: 14,
      items:
        downloadsItems.length > 0
          ? downloadsItems
          : [
              {
                id: 'dl-fallback-1',
                name: 'Open Downloads Folder',
                fullPath: 'shell:Downloads',
                isDirectory: true,
              },
            ],
    },
  ];
}

export const DEFAULT_SCHEDULES: ScheduleEntry[] = [];
