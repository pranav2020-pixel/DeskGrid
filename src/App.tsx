import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  FolderPlus,
  LayoutGrid,
  RefreshCw,
  Magnet,
  Move,
  Search,
  X,
  EyeOff,
  RotateCcw,
  Sparkles,
  Monitor,
  Power,
  Image as ImageIcon,
  Film,
  Settings,
} from 'lucide-react';
import {
  DesktopBlock,
  DesktopItem,
  DimensionMatch,
  GuideLine,
  Rect,
  ScheduleEntry,
  SpacingGuide,
} from './types';
import { buildDefaultBlocks, DEFAULT_SCHEDULES } from './data/defaultLayout';
import {
  clampToWorkArea,
  computeAlignmentAndGuides,
  getEffectiveRect,
  resolveOverlapsByShifting,
} from './engine/alignmentEngine';
import { DrawerBox } from './components/DrawerBox';
import { DesktopWidgetBlock } from './components/DesktopWidgets';
import { AlignmentGuides } from './components/AlignmentGuides';

declare global {
  interface Window {
    deskgridAPI?: {
      isElectron: boolean;
      scanDesktop: () => Promise<{
        items: DesktopItem[];
        downloadsItems: DesktopItem[];
      }>;
      getWallpaper: () => Promise<string | null>;
      getActiveLivelyVideo: () => Promise<{
        ok: boolean;
        videoPath: string;
        fileUrl: string;
        title: string;
      } | null>;
      wallpaperAction: (
        action:
          | 'open-lively'
          | 'windows-settings'
          | 'toggle-native-icons'
          | 'set-windows-wallpaper'
          | 'pick-custom-media'
      ) => Promise<{ ok: boolean; fileUrl?: string; isVideo?: boolean; mode?: string; dataUrl?: string }>;
      openItem: (itemPath: string) => Promise<{ ok: boolean }>;
      showInFolder: (itemPath: string) => Promise<{ ok: boolean }>;
      pickItems: (options: { mode: 'files' | 'folder' }) => Promise<DesktopItem[]>;
      getIconForPath: (itemPath: string) => Promise<string | null>;
      loadState: () => Promise<any>;
      saveState: (state: any) => Promise<{ ok: boolean }>;
      setClickThrough: (ignore: boolean) => void;
      sendToDesktopBottom: () => void;
      runSystemAction: (action: string) => Promise<{ ok: boolean }>;
      getWorkArea: () => Promise<{ x: number; y: number; width: number; height: number }>;
      minimizeOrHide: () => void;
      quitApp: () => void;
      onWorkAreaChanged: (
        cb: (rect: { x: number; y: number; width: number; height: number }) => void
      ) => () => void;
      onTrayCommand: (cb: (cmd: string) => void) => () => void;
      onWallpaperChanged: (cb: (dataUrl: string) => void) => () => void;
    };
  }
}

interface DragSession {
  blockId: string;
  mode: 'move' | 'resize';
  resizeDir?: string;
  startMouseX: number;
  startMouseY: number;
  initialRect: Rect;
}

export const App: React.FC = () => {
  const [workArea, setWorkArea] = useState<{ width: number; height: number }>({
    width: window.innerWidth || 1536,
    height: window.innerHeight || 824,
  });

  const [blocks, setBlocks] = useState<DesktopBlock[]>(() =>
    buildDefaultBlocks(window.innerWidth || 1536, window.innerHeight || 824)
  );
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(DEFAULT_SCHEDULES);
  const [weatherCity, setWeatherCity] = useState<string>('New York');
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [autoShiftOnOverlap, setAutoShiftOnOverlap] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showHudPill, setShowHudPill] = useState<boolean>(true);
  const [globalOpacity, setGlobalOpacity] = useState<number>(0.78);
  // Default to Windows System Wallpaper on initial launch
  const [wallpaperMode, setWallpaperMode] = useState<'passthrough' | 'static-sync' | 'custom-media'>('static-sync');
  const [wallpaperDataUrl, setWallpaperDataUrl] = useState<string | null>(null);
  const [customMedia, setCustomMedia] = useState<{ url: string; isVideo: boolean; title?: string } | null>(null);
  const [showWallpaperMenu, setShowWallpaperMenu] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showCompanionCat, setShowCompanionCat] = useState<boolean>(true);
  const [catPos, setCatPos] = useState<{ x: number; y: number }>({
    x: Math.round((window.innerWidth || 1536) * 0.65),
    y: Math.round((window.innerHeight || 824) * 0.8),
  });

  // Active Drag / Resize & Live Guide Line State
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);
  const [activeSpacings, setActiveSpacings] = useState<SpacingGuide[]>([]);
  const [activeDimMatches, setActiveDimMatches] = useState<DimensionMatch[]>([]);
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);

  // Desktop Canvas Right-Click Context Menu
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const showNotification = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  // Initialize from Electron or localStorage
  useEffect(() => {
    let mounted = true;
    async function init() {
      let wa = { width: window.innerWidth, height: window.innerHeight };
      if (window.deskgridAPI) {
        try {
          const wp = await window.deskgridAPI.getWallpaper();
          if (mounted && wp) setWallpaperDataUrl(wp);
        } catch (_) {}

        try {
          const area = await window.deskgridAPI.getWorkArea();
          if (area && area.width > 200) {
            wa = { width: area.width, height: area.height };
            if (mounted) setWorkArea(wa);
          }
        } catch (_) {}

        let saved = null;
        try {
          saved = await window.deskgridAPI.loadState();
        } catch (_) {}

        if (saved && Array.isArray(saved.blocks) && saved.blocks.length > 0) {
          if (mounted) {
            setBlocks(saved.blocks);
            if (Array.isArray(saved.schedules)) setSchedules(saved.schedules);
            if (saved.weatherCity) setWeatherCity(saved.weatherCity);
            if (typeof saved.snapEnabled === 'boolean') setSnapEnabled(saved.snapEnabled);
            if (typeof saved.autoShiftOnOverlap === 'boolean')
              setAutoShiftOnOverlap(saved.autoShiftOnOverlap);
            if (typeof saved.globalOpacity === 'number')
              setGlobalOpacity(saved.globalOpacity);

            if (saved.wallpaperMode) setWallpaperMode(saved.wallpaperMode);
            if (saved.customMedia) setCustomMedia(saved.customMedia);
            setIsInitialized(true);
          }
          return;
        }

        // FRESH INSTALL / FIRST LAUNCH:
        // Dynamically scan the user's REAL Windows Desktop and arrange their actual apps
        try {
          const scanned = await window.deskgridAPI.scanDesktop();
          if (mounted) {
            const initial = buildDefaultBlocks(
              wa.width,
              wa.height,
              scanned?.items || [],
              scanned?.downloadsItems || []
            );
            setBlocks(initial);
            setWallpaperMode('static-sync');
            setIsInitialized(true);
          }
        } catch (_) {
          if (mounted) {
            setBlocks(buildDefaultBlocks(wa.width, wa.height, [], []));
            setWallpaperMode('static-sync');
            setIsInitialized(true);
          }
        }
      } else {
        // Browser fallback persistence
        try {
          const raw = localStorage.getItem('deskgrid-state-v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.blocks?.length) {
              setBlocks(parsed.blocks);
              if (parsed.schedules) setSchedules(parsed.schedules);
              if (parsed.weatherCity) setWeatherCity(parsed.weatherCity);
              if (typeof parsed.globalOpacity === 'number') setGlobalOpacity(parsed.globalOpacity);
              if (parsed.wallpaperMode) setWallpaperMode(parsed.wallpaperMode);
              if (parsed.customMedia) setCustomMedia(parsed.customMedia);
            }
          }
        } catch (_) {}
        if (mounted) setIsInitialized(true);
      }
    }
    init();

    const handleResize = () => {
      setWorkArea({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Save state whenever blocks, schedules, or settings change (debounced)
  // Guarded by isInitialized so it NEVER overwrites on first launch before scanning
  useEffect(() => {
    if (!isInitialized) return;
    const timer = setTimeout(() => {
      const payload = {
        blocks,
        schedules,
        weatherCity,
        snapEnabled,
        autoShiftOnOverlap,
        globalOpacity,
        wallpaperMode,
        customMedia,
      };
      if (window.deskgridAPI) {
        window.deskgridAPI.saveState(payload);
      } else {
        try {
          localStorage.setItem('deskgrid-state-v1', JSON.stringify(payload));
        } catch (_) {}
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [isInitialized, blocks, schedules, weatherCity, snapEnabled, autoShiftOnOverlap, globalOpacity, wallpaperMode, customMedia]);

  // Listen to Electron WorkArea changes (e.g., if user moves/resizes Windows Taskbar)
  useEffect(() => {
    if (!window.deskgridAPI) return;
    const unsubWorkArea = window.deskgridAPI.onWorkAreaChanged((rect) => {
      setWorkArea({ width: rect.width, height: rect.height });
      // Clamp all blocks so none ever touch or go under the taskbar
      setBlocks((prev) =>
        prev.map((b) => {
          const clamped = clampToWorkArea(getEffectiveRect(b), {
            width: rect.width,
            height: rect.height,
          });
          return { ...b, x: clamped.x, y: clamped.y, width: clamped.width };
        })
      );
    });

    const unsubTray = window.deskgridAPI.onTrayCommand((cmd) => {
      if (cmd === 'add-drawer') handleAddDrawer();
      if (cmd === 'auto-align') handleAutoAlignAll();
      if (cmd === 'rescan') handleRescanDesktop();
    });

    const unsubWallpaper = window.deskgridAPI.onWallpaperChanged((freshDataUrl) => {
      setWallpaperDataUrl(freshDataUrl);
      setWallpaperMode('static-sync');
      showNotification('Updated desktop wallpaper!');
    });

    return () => {
      unsubWorkArea();
      unsubTray();
      unsubWallpaper();
    };
  }, []);

  // Keyboard shortcuts (Ctrl+F for search, Escape to close menus)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setCanvasMenu(null);
      }
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Active Drag & 8-Direction Resize Mouse Loop with Real-Time Guide & Level Lines
  useEffect(() => {
    if (!dragSession) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragSession.startMouseX;
      const dy = e.clientY - dragSession.startMouseY;
      const { initialRect, mode, resizeDir, blockId } = dragSession;

      let proposed: Rect = { ...initialRect };

      if (mode === 'move') {
        proposed.x = initialRect.x + dx;
        proposed.y = initialRect.y + dy;
      } else if (mode === 'resize' && resizeDir) {
        if (resizeDir.includes('e')) {
          proposed.width = Math.max(150, initialRect.width + dx);
        }
        if (resizeDir.includes('s')) {
          proposed.height = Math.max(90, initialRect.height + dy);
        }
        if (resizeDir.includes('w')) {
          const maxDelta = initialRect.width - 150;
          const clampedDx = Math.min(dx, maxDelta);
          proposed.x = initialRect.x + clampedDx;
          proposed.width = initialRect.width - clampedDx;
        }
        if (resizeDir.includes('n')) {
          const maxDelta = initialRect.height - 90;
          const clampedDy = Math.min(dy, maxDelta);
          proposed.y = initialRect.y + clampedDy;
          proposed.height = initialRect.height - clampedDy;
        }
      }

      // Hold Alt to temporarily bypass magnetic snap
      const effectiveSnap = snapEnabled && !e.altKey;

      const snapResult = computeAlignmentAndGuides(
        blockId,
        proposed,
        blocksRef.current,
        workArea,
        mode,
        resizeDir,
        effectiveSnap
      );

      setActiveGuides(snapResult.guides);
      setActiveSpacings(snapResult.spacings);
      setActiveDimMatches(snapResult.dimensionMatches);
      setIsShiftPressed(e.shiftKey || autoShiftOnOverlap);

      setBlocks((prev) => {
        let updated = prev.map((b) => {
          if (b.id !== blockId) return b;
          return {
            ...b,
            x: snapResult.rect.x,
            y: snapResult.rect.y,
            width: snapResult.rect.width,
            height: b.collapsed ? b.height : snapResult.rect.height,
            expandedHeight: b.collapsed ? b.expandedHeight : snapResult.rect.height,
          };
        });

        // If Shift is held or Auto-Shift mode is enabled, smoothly shift overlapping neighbors
        if (e.shiftKey || autoShiftOnOverlap) {
          updated = resolveOverlapsByShifting(blockId, updated, workArea);
        }

        return updated;
      });
    };

    const handleMouseUp = () => {
      setDragSession(null);
      setActiveGuides([]);
      setActiveSpacings([]);
      setActiveDimMatches([]);
      if (window.deskgridAPI) {
        window.deskgridAPI.sendToDesktopBottom();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragSession, snapEnabled, autoShiftOnOverlap, workArea]);

  const bringToFront = (id: string) => {
    setBlocks((prev) => {
      const maxZ = prev.reduce((m, b) => Math.max(m, b.zIndex || 1), 1);
      return prev.map((b) => (b.id === id ? { ...b, zIndex: maxZ + 1 } : b));
    });
  };

  const handleStartMove = (e: React.MouseEvent, block: DesktopBlock) => {
    if (e.button !== 0 || block.locked) return;
    e.stopPropagation();
    setCanvasMenu(null);
    bringToFront(block.id);
    setDragSession({
      blockId: block.id,
      mode: 'move',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialRect: getEffectiveRect(block),
    });
  };

  const handleStartResize = (
    e: React.MouseEvent,
    block: DesktopBlock,
    resizeDir: string
  ) => {
    if (e.button !== 0 || block.locked) return;
    e.stopPropagation();
    setCanvasMenu(null);
    bringToFront(block.id);
    setDragSession({
      blockId: block.id,
      mode: 'resize',
      resizeDir,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialRect: getEffectiveRect(block),
    });
  };

  // Add a new customizable drawer
  const handleAddDrawer = (customPos?: { x: number; y: number }, isPortal = false) => {
    const maxZ = blocks.reduce((m, b) => Math.max(m, b.zIndex || 1), 1);
    const width = 240;
    const height = 220;
    const x = customPos ? customPos.x : Math.round(workArea.width / 2 - width / 2);
    const y = customPos ? customPos.y : Math.round(workArea.height / 2 - height / 2);
    const clamped = clampToWorkArea({ x, y, width, height }, workArea);

    const newDrawer: DesktopBlock = {
      id: `drawer-${Date.now()}`,
      title: isPortal ? 'Folder Portal' : `New Drawer ${blocks.filter((b) => b.kind === 'drawer').length + 1}`,
      kind: 'drawer',
      x: clamped.x,
      y: clamped.y,
      width: clamped.width,
      height: clamped.height,
      isPortal,
      opacity: 0.78,
      zIndex: maxZ + 1,
      items: [],
    };

    setBlocks((prev) => [...prev, newDrawer]);
    showNotification(
      isPortal
        ? 'Created Folder Portal — click folder icon to add folders!'
        : 'Created new Drawer — double-click title to rename!'
    );
  };

  // Rescan Windows Desktop and merge any new shortcuts/files/folders
  const handleRescanDesktop = async () => {
    if (!window.deskgridAPI) {
      showNotification('Desktop rescan complete');
      return;
    }
    showNotification('Scanning Windows Desktop...');
    const scanned = await window.deskgridAPI.scanDesktop();
    setBlocks((prev) => {
      const existingNames = new Set<string>();
      for (const b of prev) {
        for (const it of b.items) {
          existingNames.add(it.name.toLowerCase());
        }
      }
      const newItems = scanned.items.filter(
        (it) => !existingNames.has(it.name.toLowerCase())
      );
      if (newItems.length === 0) return prev;

      return prev.map((b) => {
        if (b.kind !== 'drawer') return b;
        const matching = newItems.filter(
          (it) => (it.category || 'Programs').toLowerCase() === b.title.toLowerCase()
        );
        if (matching.length === 0) return b;
        return { ...b, items: [...b.items, ...matching] };
      });
    });
    showNotification('Synced with Windows Desktop!');
  };

  // Auto-Level & Snap All Drawers to clean aligned coordinates
  const handleAutoAlignAll = () => {
    const GRID = 8;
    setBlocks((prev) =>
      prev.map((b) => {
        const snappedX = Math.round(b.x / GRID) * GRID;
        const snappedY = Math.round(b.y / GRID) * GRID;
        const snappedW = Math.round(b.width / GRID) * GRID;
        const snappedH = Math.round(b.height / GRID) * GRID;
        const clamped = clampToWorkArea(
          { x: snappedX, y: snappedY, width: snappedW, height: snappedH },
          workArea
        );
        return {
          ...b,
          x: clamped.x,
          y: clamped.y,
          width: clamped.width,
          height: b.collapsed ? b.height : clamped.height,
        };
      })
    );
    showNotification('All drawers leveled & aligned to grid!');
  };

  const handleResetDefaultLayout = async () => {
    if (window.deskgridAPI) {
      const scanned = await window.deskgridAPI.scanDesktop();
      setBlocks(
        buildDefaultBlocks(
          workArea.width,
          workArea.height,
          scanned.items,
          scanned.downloadsItems
        )
      );
    } else {
      setBlocks(buildDefaultBlocks(workArea.width, workArea.height));
    }
    showNotification('Restored default desktop layout');
  };

  const handleRenameBlock = (id: string, newTitle: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, title: newTitle } : b))
    );
  };

  const handleToggleCollapse = (id: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const nextCollapsed = !b.collapsed;
        return {
          ...b,
          collapsed: nextCollapsed,
          height: nextCollapsed ? b.height : b.expandedHeight || Math.max(180, b.height),
        };
      })
    );
  };

  const handleToggleLock = (id: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, locked: !b.locked } : b))
    );
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    showNotification('Drawer removed');
  };

  const handleChangeAccent = (id: string, color: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, accentColor: color } : b))
    );
  };

  const handleChangeOpacity = (id: string, opacity: number) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, opacity } : b))
    );
  };

  const handleGlobalOpacityChange = (opacity: number) => {
    setGlobalOpacity(opacity);
    setBlocks((prev) =>
      prev.map((b) => ({ ...b, opacity }))
    );
  };

  const handleAddItems = async (blockId: string, mode: 'files' | 'folder') => {
    if (window.deskgridAPI) {
      const picked = await window.deskgridAPI.pickItems({ mode });
      if (picked && picked.length > 0) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId ? { ...b, items: [...b.items, ...picked] } : b
          )
        );
        showNotification(`Added ${picked.length} item(s)`);
      }
    } else {
      const name = window.prompt(
        mode === 'folder' ? 'Enter folder name to add:' : 'Enter shortcut/app name:'
      );
      if (!name) return;
      const newItem: DesktopItem = {
        id: `custom-${Date.now()}`,
        name: name.trim(),
        fullPath: 'shell:Personal',
        isDirectory: mode === 'folder',
        isShortcut: mode !== 'folder',
      };
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, items: [...b.items, newItem] } : b
        )
      );
    }
  };

  const handleOpenItem = async (item: DesktopItem) => {
    if (window.deskgridAPI) {
      await window.deskgridAPI.openItem(item.fullPath);
      showNotification(`Launching ${item.name}...`);
    } else if (item.fullPath.startsWith('http')) {
      window.open(item.fullPath, '_blank');
    } else {
      showNotification(`Opening: ${item.name}`);
    }
  };

  const handleShowInFolder = async (item: DesktopItem) => {
    if (window.deskgridAPI) {
      await window.deskgridAPI.showInFolder(item.fullPath);
    } else {
      showNotification(`Path: ${item.fullPath}`);
    }
  };

  const handleRemoveItem = (blockId: string, itemId: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, items: b.items.filter((it) => it.id !== itemId) }
          : b
      )
    );
  };

  const handleMoveItemBetweenDrawers = (
    sourceBlockId: string,
    itemId: string,
    targetBlockId: string
  ) => {
    setBlocks((prev) => {
      const source = prev.find((b) => b.id === sourceBlockId);
      const item = source?.items.find((it) => it.id === itemId);
      if (!item) return prev;
      return prev.map((b) => {
        if (b.id === sourceBlockId) {
          return { ...b, items: b.items.filter((it) => it.id !== itemId) };
        }
        if (b.id === targetBlockId) {
          return { ...b, items: [...b.items, item] };
        }
        return b;
      });
    });
  };

  const handleDropExternalFiles = async (blockId: string, fileList: FileList) => {
    const newItems: DesktopItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i] as File & { path?: string };
      const fullPath = f.path || f.name;
      const extMatch = f.name.match(/\.[^.]+$/);
      const ext = extMatch ? extMatch[0].toLowerCase() : '';
      const isShortcut = ext === '.lnk' || ext === '.url';
      const displayName = isShortcut ? f.name.slice(0, -ext.length) : f.name;

      let iconDataUrl: string | null = null;
      if (window.deskgridAPI && f.path) {
        iconDataUrl = await window.deskgridAPI.getIconForPath(f.path);
      }

      newItems.push({
        id: `drop-${Date.now()}-${i}`,
        name: displayName,
        fullPath,
        extension: ext,
        isDirectory: ext === '' && f.size === 0,
        isShortcut,
        iconDataUrl,
      });
    }

    if (newItems.length > 0) {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? { ...b, collapsed: false, items: [...b.items, ...newItems] }
            : b
        )
      );
      showNotification(`Dropped ${newItems.length} item(s) into drawer`);
    }
  };

  const handleQuickToolAction = (action: string) => {
    switch (action) {
      case 'search':
        setSearchOpen((v) => !v);
        break;
      case 'add-drawer':
        handleAddDrawer();
        break;
      case 'add-portal':
        handleAddDrawer(undefined, true);
        break;
      case 'rescan':
        handleRescanDesktop();
        break;
      case 'snip':
        if (window.deskgridAPI) {
          window.deskgridAPI.runSystemAction('snip');
        } else {
          showNotification('Triggered Windows Snipping Tool (ms-screenclip:)');
        }
        break;
      case 'toggle-shift':
        setAutoShiftOnOverlap((v) => {
          const next = !v;
          showNotification(
            next
              ? 'Auto-Shift Neighbors ON: Drawers shift away on overlap'
              : 'Auto-Shift Neighbors OFF: Hold Shift while dragging to shift'
          );
          return next;
        });
        break;
      case 'export':
        handleResetDefaultLayout();
        break;
      case 'auto-align':
        handleAutoAlignAll();
        break;
      default:
        break;
    }
  };

  const activeBlock = dragSession
    ? blocks.find((b) => b.id === dragSession.blockId) || null
    : null;
  const activeEffectiveRect = activeBlock ? getEffectiveRect(activeBlock) : null;

  return (
    <div
      className="deskgrid-workspace"
      style={
        wallpaperMode === 'static-sync' && wallpaperDataUrl
          ? {
              backgroundImage: `url("${wallpaperDataUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : wallpaperMode === 'custom-media' && customMedia && !customMedia.isVideo
          ? {
              backgroundImage: `url("${customMedia.url}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : { background: 'transparent' }
      }
      onClick={() => {
        setCanvasMenu(null);
        setShowWallpaperMenu(false);
        if (window.deskgridAPI) {
          window.deskgridAPI.sendToDesktopBottom();
        }
      }}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('deskgrid-workspace')) {
          if (window.deskgridAPI) {
            window.deskgridAPI.minimizeOrHide();
          }
        }
      }}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).classList.contains('deskgrid-workspace')) {
          e.preventDefault();
          setCanvasMenu({ x: e.clientX, y: e.clientY });
        }
      }}
    >
      {/* Optional Built-in Custom Video Wallpaper Layer */}
      {wallpaperMode === 'custom-media' && customMedia?.isVideo && (
        <video
          key={customMedia.url}
          className="deskgrid-video-bg"
          src={customMedia.url}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {/* Top Floating Control Pill (Hover-revealed or toggleable) */}
      {showHudPill && (
        <div className="deskgrid-top-dock">
          <div className="dock-brand">
            <Sparkles size={13} className="brand-sparkle" />
            <span>DeskGrid</span>
          </div>
          <div className="dock-divider" />
          <button
            type="button"
            className="dock-btn"
            onClick={() => handleAddDrawer()}
            title="Create a new draggable drawer"
          >
            <Plus size={13} />
            <span>New Drawer</span>
          </button>
          <button
            type="button"
            className="dock-btn"
            onClick={() => handleAddDrawer(undefined, true)}
            title="Create a collapsible folder portal drawer"
          >
            <FolderPlus size={13} />
            <span>Portal</span>
          </button>
          <button
            type="button"
            className={`dock-btn ${snapEnabled ? 'active' : ''}`}
            onClick={() => {
              setSnapEnabled((v) => !v);
              showNotification(
                !snapEnabled
                  ? 'Magnetic Guide & Level Lines Enabled'
                  : 'Guide & Level Lines Disabled'
              );
            }}
            title="Toggle Magnetic Guide & Level Lines (or hold Alt while dragging)"
          >
            <Magnet size={13} />
            <span>Guides {snapEnabled ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type="button"
            className={`dock-btn ${autoShiftOnOverlap ? 'active' : ''}`}
            onClick={() => {
              setAutoShiftOnOverlap((v) => !v);
              showNotification(
                !autoShiftOnOverlap
                  ? 'Auto-Shift ON: Drawers shift smoothly when pushed'
                  : 'Auto-Shift OFF (Hold Shift while dragging to shift)'
              );
            }}
            title="Auto-shift neighboring drawers when dragging/moving"
          >
            <Move size={13} />
            <span>Shift {autoShiftOnOverlap ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type="button"
            className="dock-btn"
            onClick={handleAutoAlignAll}
            title="Snap all drawers to clean level lines"
          >
            <LayoutGrid size={13} />
            <span>Level All</span>
          </button>
          <div className="dock-menu-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`dock-btn ${showWallpaperMenu ? 'active' : ''}`}
              onClick={() => setShowWallpaperMenu((v) => !v)}
              title="Manage Lively Wallpaper, Live Background & Desktop Icons"
            >
              <ImageIcon size={13} />
              <span>Wallpaper</span>
            </button>
            {showWallpaperMenu && (
              <div className="wallpaper-dropdown-menu">
                <div className="wp-menu-header">Wallpaper & Background</div>
                <button
                  type="button"
                  className={wallpaperMode === 'custom-media' && customMedia?.isVideo ? 'active-wp-opt' : ''}
                  onClick={async () => {
                    setShowWallpaperMenu(false);
                    const lively = await window.deskgridAPI?.getActiveLivelyVideo?.();
                    if (lively?.ok && lively.fileUrl) {
                      setCustomMedia({
                        url: lively.fileUrl,
                        isVideo: true,
                        title: lively.title || 'Live Wallpaper',
                      });
                      setWallpaperMode('custom-media');
                      showNotification(`Playing Live Animated Wallpaper: ${lively.title || 'Active Video'}`);
                    } else if (customMedia?.isVideo) {
                      setWallpaperMode('custom-media');
                      showNotification('Playing Live Animated Wallpaper!');
                    } else {
                      const res = await window.deskgridAPI?.wallpaperAction('pick-custom-media');
                      if (res?.ok && res.fileUrl) {
                        setCustomMedia({ url: res.fileUrl, isVideo: Boolean(res.isVideo) });
                        setWallpaperMode('custom-media');
                        showNotification('Applied live video wallpaper!');
                      }
                    }
                  }}
                  title="Plays smooth hardware-accelerated animated wallpaper and hides old desktop icons"
                >
                  <Sparkles size={13} />
                  <span>Live Animated Wallpaper (Lively / Video Sync)</span>
                </button>

                <button
                  type="button"
                  className={wallpaperMode === 'static-sync' ? 'active-wp-opt' : ''}
                  onClick={async () => {
                    const wp = await window.deskgridAPI?.getWallpaper();
                    if (wp) setWallpaperDataUrl(wp);
                    setWallpaperMode('static-sync');
                    setShowWallpaperMenu(false);
                    showNotification('Windows System Wallpaper (Instant Sync Active)');
                  }}
                  title="Displays current Windows system wallpaper and hides old desktop icons"
                >
                  <ImageIcon size={13} />
                  <span>Windows System Wallpaper (Instant Sync)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setShowWallpaperMenu(false);
                    const res = await window.deskgridAPI?.wallpaperAction('pick-custom-media');
                    if (res?.ok && res.fileUrl) {
                      setCustomMedia({ url: res.fileUrl, isVideo: Boolean(res.isVideo) });
                      setWallpaperMode('custom-media');
                      showNotification('Applied custom video/image wallpaper!');
                    }
                  }}
                >
                  <Film size={13} />
                  <span>Load Custom Video (.mp4) / Image Here...</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setShowWallpaperMenu(false);
                    const res = await window.deskgridAPI?.wallpaperAction('set-windows-wallpaper');
                    if (res?.ok && res.dataUrl) {
                      setWallpaperDataUrl(res.dataUrl);
                      setWallpaperMode('static-sync');
                      showNotification('Updated Windows System Wallpaper!');
                    }
                  }}
                >
                  <Monitor size={13} />
                  <span>Change Windows System Wallpaper...</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowWallpaperMenu(false);
                    window.deskgridAPI?.wallpaperAction('windows-settings');
                  }}
                >
                  <Settings size={13} />
                  <span>Open Windows Personalization Settings</span>
                </button>

                <button
                  type="button"
                  className={wallpaperMode === 'passthrough' ? 'active-wp-opt' : ''}
                  onClick={() => {
                    setWallpaperMode('passthrough');
                    setShowWallpaperMenu(false);
                    showNotification('Transparent Mode ON: Showing raw desktop behind');
                  }}
                  title="Makes DeskGrid fully transparent (shows raw Windows desktop directly behind)"
                >
                  <EyeOff size={13} />
                  <span>Transparent Pass-Through Mode</span>
                </button>

                <div className="ctx-sep" />
                <div className="wp-menu-header">All Drawers Opaqueness ({Math.round(globalOpacity * 100)}%)</div>
                <div className="dock-opacity-slider-box">
                  <input
                    type="range"
                    min="0.10"
                    max="1.0"
                    step="0.05"
                    value={globalOpacity}
                    onChange={(e) => handleGlobalOpacityChange(parseFloat(e.target.value))}
                    className="drawer-opacity-slider"
                  />
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="dock-btn"
            onClick={() => setSearchOpen((v) => !v)}
            title="Search desktop items (Ctrl+F)"
          >
            <Search size={13} />
          </button>
          <div className="dock-divider" />
          <button
            type="button"
            className="dock-btn"
            onClick={() => {
              if (window.deskgridAPI) {
                window.deskgridAPI.minimizeOrHide();
              }
            }}
            title="Switch to Original Windows Desktop (Shortcut: Alt+D or Double-Click empty space)"
          >
            <Monitor size={13} />
            <span>Original Desktop (Alt+D)</span>
          </button>
          <button
            type="button"
            className="dock-btn subtle"
            onClick={() => setShowHudPill(false)}
            title="Hide top bar (Right-click desktop anytime to reopen)"
          >
            <EyeOff size={12} />
          </button>
          <button
            type="button"
            className="dock-btn danger-btn"
            onClick={() => {
              if (window.deskgridAPI) {
                window.deskgridAPI.quitApp();
              }
            }}
            title="Exit DeskGrid completely"
          >
            <Power size={12} />
          </button>
        </div>
      )}

      {/* Search Overlay Bar */}
      {searchOpen && (
        <div className="deskgrid-search-bar">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Filter apps, folders & files across all drawers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="close-search-btn"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery('');
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Render All Drawers & Widgets */}
      {blocks.map((block) =>
        block.kind === 'drawer' ? (
          <DrawerBox
            key={block.id}
            block={block}
            isActive={dragSession?.blockId === block.id}
            searchQuery={searchQuery}
            onStartMove={handleStartMove}
            onStartResize={handleStartResize}
            onRename={handleRenameBlock}
            onToggleCollapse={handleToggleCollapse}
            onToggleLock={handleToggleLock}
            onDeleteBlock={handleDeleteBlock}
            onAddItems={handleAddItems}
            onOpenItem={handleOpenItem}
            onShowInFolder={handleShowInFolder}
            onRemoveItem={handleRemoveItem}
            onMoveItemBetweenDrawers={handleMoveItemBetweenDrawers}
            onDropExternalFiles={handleDropExternalFiles}
            onChangeAccent={handleChangeAccent}
            onChangeOpacity={handleChangeOpacity}
            globalOpacity={globalOpacity}
          />
        ) : (
          <DesktopWidgetBlock
            key={block.id}
            block={block}
            isActive={dragSession?.blockId === block.id}
            onStartMove={handleStartMove}
            onStartResize={handleStartResize}
            schedules={schedules}
            onAddSchedule={(date, title, time) => {
              setSchedules((prev) => [
                ...prev,
                {
                  id: `sch-${Date.now()}`,
                  date,
                  title,
                  time,
                  completed: false,
                },
              ]);
            }}
            onToggleSchedule={(id) => {
              setSchedules((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, completed: !s.completed } : s
                )
              );
            }}
            onDeleteSchedule={(id) => {
              setSchedules((prev) => prev.filter((s) => s.id !== id));
            }}
            weatherCity={weatherCity}
            onChangeWeatherCity={setWeatherCity}
            onQuickToolAction={handleQuickToolAction}
            autoShiftOnOverlap={autoShiftOnOverlap}
          />
        )
      )}

      {/* Sleeping Desktop Cat Companion (from screenshot, draggable!) */}
      {showCompanionCat && (
        <div
          className="desktop-cat-companion"
          style={{ left: catPos.x, top: catPos.y }}
          title="Drag to move desktop pet • Right-click desktop to hide"
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const origX = catPos.x;
            const origY = catPos.y;
            const onMove = (me: MouseEvent) => {
              setCatPos({
                x: Math.max(10, Math.min(workArea.width - 100, origX + (me.clientX - startX))),
                y: Math.max(10, Math.min(workArea.height - 90, origY + (me.clientY - startY))),
              });
            };
            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        >
          <svg width="88" height="72" viewBox="0 0 110 90" fill="none">
            {/* Sleeping calico cat matching screenshot */}
            <ellipse cx="56" cy="56" rx="34" ry="22" fill="#FFF7ED" />
            {/* Ginger patches + stripes */}
            <path
              d="M48 35C58 34 72 38 80 48C72 52 58 48 48 35Z"
              fill="#D97706"
              opacity="0.75"
            />
            <path
              d="M78 52C88 56 95 66 92 78C87 77 84 68 78 62"
              stroke="#B45309"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Head */}
            <circle cx="36" cy="46" r="20" fill="#FFF7ED" />
            <path d="M20 34L17 18L31 27Z" fill="#D97706" />
            <path d="M42 27L52 16L52 33Z" fill="#78350F" />
            <path d="M21 31L19 21L29 27Z" fill="#FBCFE8" />
            {/* Sleeping eyes */}
            <path d="M25 46C27 49 31 49 33 46" stroke="#451A03" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M39 48C41 51 45 51 47 48" stroke="#451A03" strokeWidth="2.2" strokeLinecap="round" />
            {/* Pink cheeks & nose */}
            <ellipse cx="23" cy="50" rx="3.5" ry="2" fill="#F472B6" opacity="0.6" />
            <ellipse cx="48" cy="52" rx="3.5" ry="2" fill="#F472B6" opacity="0.6" />
            <path d="M34 51L37 51L35.5 53Z" fill="#FB7185" />
            {/* Paws */}
            <ellipse cx="26" cy="65" rx="7" ry="4.5" fill="#FFF7ED" stroke="#FDE68A" strokeWidth="1" />
            <ellipse cx="52" cy="72" rx="7" ry="4.5" fill="#FFF7ED" stroke="#FDE68A" strokeWidth="1" />
          </svg>
        </div>
      )}

      {/* Real-time Magnetic Guide & Level Lines SVG Overlay */}
      <AlignmentGuides
        activeBlockId={dragSession?.blockId || null}
        activeRect={activeEffectiveRect}
        guides={activeGuides}
        spacings={activeSpacings}
        dimensionMatches={activeDimMatches}
        allBlocks={blocks}
        isShiftingMode={isShiftPressed}
      />

      {/* Right-click Desktop Context Menu */}
      {canvasMenu && (
        <div
          className="desktop-context-menu"
          style={{
            left: Math.min(workArea.width - 220, canvasMenu.x),
            top: Math.min(workArea.height - 260, canvasMenu.y),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              handleAddDrawer({ x: canvasMenu.x, y: canvasMenu.y });
              setCanvasMenu(null);
            }}
          >
            <Plus size={14} /> New Drawer Here
          </button>
          <button
            type="button"
            onClick={() => {
              handleAddDrawer({ x: canvasMenu.x, y: canvasMenu.y }, true);
              setCanvasMenu(null);
            }}
          >
            <FolderPlus size={14} /> New Folder Portal Here
          </button>
          <div className="ctx-sep" />
          <button
            type="button"
            onClick={() => {
              handleAutoAlignAll();
              setCanvasMenu(null);
            }}
          >
            <LayoutGrid size={14} /> Level & Align All Drawers
          </button>
          <button
            type="button"
            onClick={() => {
              setSnapEnabled((v) => !v);
              setCanvasMenu(null);
            }}
          >
            <Magnet size={14} /> Guide & Level Lines: {snapEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoShiftOnOverlap((v) => !v);
              setCanvasMenu(null);
            }}
          >
            <Move size={14} /> Auto-Shift Neighbors: {autoShiftOnOverlap ? 'ON' : 'OFF'}
          </button>
          <div className="ctx-sep" />
          <button
            type="button"
            onClick={() => {
              handleRescanDesktop();
              setCanvasMenu(null);
            }}
          >
            <RefreshCw size={14} /> Sync Windows Desktop
          </button>
          <button
            type="button"
            onClick={() => {
              setCanvasMenu(null);
              window.deskgridAPI?.wallpaperAction('windows-settings');
            }}
          >
            <ImageIcon size={14} /> Change Windows Wallpaper
          </button>
          <button
            type="button"
            onClick={() => {
              setCanvasMenu(null);
              window.deskgridAPI?.wallpaperAction('toggle-native-icons');
              showNotification('Toggled native Windows desktop icons!');
            }}
          >
            <EyeOff size={14} /> Hide/Show Native Desktop Icons
          </button>
          <button
            type="button"
            onClick={() => {
              setShowHudPill((v) => !v);
              setCanvasMenu(null);
            }}
          >
            <Sparkles size={14} /> {showHudPill ? 'Hide Top Toolbar' : 'Show Top Toolbar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCompanionCat((v) => !v);
              setCanvasMenu(null);
            }}
          >
            <span>🐱</span> {showCompanionCat ? 'Hide Desktop Pet' : 'Show Desktop Pet'}
          </button>
          <button
            type="button"
            onClick={() => {
              handleResetDefaultLayout();
              setCanvasMenu(null);
            }}
          >
            <RotateCcw size={14} /> Reset Default Layout
          </button>
          <div className="ctx-sep" />
          <button
            type="button"
            onClick={() => {
              setCanvasMenu(null);
              if (window.deskgridAPI) {
                window.deskgridAPI.minimizeOrHide();
              }
            }}
          >
            <Monitor size={14} /> Switch to Original Desktop (Alt+D)
          </button>
          <button
            type="button"
            onClick={() => {
              setCanvasMenu(null);
              if (window.deskgridAPI) {
                window.deskgridAPI.quitApp();
              }
            }}
          >
            <Power size={14} /> Exit DeskGrid Completely
          </button>
        </div>
      )}

      {/* Subtle Toast Notification */}
      {statusToast && <div className="deskgrid-toast">{statusToast}</div>}
    </div>
  );
};
