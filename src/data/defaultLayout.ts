import { DesktopBlock, DesktopItem, ScheduleEntry } from '../types';

/**
 * Generates responsive initial layout coordinates scaled to the user's primary display workArea
 * (excluding the Windows Taskbar).
 *
 * Drawers are populated STRICTLY with the user's real desktop items scanned from their PC.
 * Zero hardcoded or personal fallback apps.
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
      items: byCategory['DB and VMs'] || [],
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
      items: byCategory['coding'] || [],
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
      items: byCategory['AI'] || [],
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
      items: byCategory['GAMES'] || [],
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
      items: byCategory['socials'] || [],
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
      items: byCategory['study'] || [],
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
      items: byCategory['Programs'] || [],
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
      items: byCategory['Folders'] || [],
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
      items: byCategory['Files & Documents'] || [],
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
      items: downloadsItems || [],
    },
  ];
}

export const DEFAULT_SCHEDULES: ScheduleEntry[] = [];

/**
 * Synchronizes newly scanned desktop items with the user's existing layout:
 * 1. PRESERVES all existing drawers, including newly added user drawers!
 * 2. PRESERVES all items in the exact drawers where the user placed/shifted them!
 * 3. Updates existing items' icons and target paths if fresh ones are detected.
 * 4. Adds ONLY truly new items (items on Desktop not currently in any drawer) to the appropriate drawer.
 * 5. Removes items that were deleted from the Desktop.
 */
export function syncScannedWithExistingBlocks(
  existingBlocks: DesktopBlock[],
  scannedItems: DesktopItem[] = [],
  downloadsItems: DesktopItem[] = []
): DesktopBlock[] {
  if (!existingBlocks || existingBlocks.length === 0) {
    return buildDefaultBlocks(1536, 824, scannedItems, downloadsItems);
  }

  // 1. Index scanned items by normalized path and by display name
  const scannedByPath = new Map<string, DesktopItem>();
  const scannedByName = new Map<string, DesktopItem>();
  for (const s of scannedItems) {
    if (s.fullPath) scannedByPath.set(s.fullPath.toLowerCase().trim(), s);
    if (s.name) scannedByName.set(s.name.toLowerCase().trim(), s);
  }

  // 2. Identify which items already exist across all user blocks
  const existingPaths = new Set<string>();
  const existingNames = new Set<string>();
  for (const b of existingBlocks) {
    if (Array.isArray(b.items)) {
      for (const it of b.items) {
        if (it.fullPath) existingPaths.add(it.fullPath.toLowerCase().trim());
        if (it.name) existingNames.add(it.name.toLowerCase().trim());
      }
    }
  }

  // 3. Find truly new items that are on the Desktop but not in ANY current drawer
  const newItems: DesktopItem[] = [];
  for (const s of scannedItems) {
    const p = (s.fullPath || '').toLowerCase().trim();
    const n = (s.name || '').toLowerCase().trim();
    const isAlreadyPresent = (p && existingPaths.has(p)) || (n && existingNames.has(n));
    if (!isAlreadyPresent) {
      newItems.push(s);
    }
  }

  // Helper to categorize new items into drawers
  const findTargetBlockForNewItem = (item: DesktopItem, blocks: DesktopBlock[]): DesktopBlock | null => {
    const itemCat = (item.category || '').toLowerCase().trim();

    // a. Try to match drawer title directly with item category
    if (itemCat) {
      const match = blocks.find(
        (b) => b.kind === 'drawer' && b.title.toLowerCase().trim() === itemCat
      );
      if (match) return match;
    }

    // b. Match by folder vs file vs program
    if (item.isDirectory) {
      const folderBlock = blocks.find(
        (b) => b.kind === 'drawer' && (b.title.toLowerCase().includes('folder') || b.isPortal)
      );
      if (folderBlock) return folderBlock;
    } else if (item.isShortcut || (item.extension && item.extension.toLowerCase() === '.exe')) {
      const progBlock = blocks.find(
        (b) => b.kind === 'drawer' && b.title.toLowerCase().includes('program')
      );
      if (progBlock) return progBlock;
    } else {
      const fileBlock = blocks.find(
        (b) =>
          b.kind === 'drawer' &&
          (b.title.toLowerCase().includes('file') || b.title.toLowerCase().includes('document'))
      );
      if (fileBlock) return fileBlock;
    }

    // c. Fallback to the first non-portal drawer block
    const firstDrawer =
      blocks.find((b) => b.kind === 'drawer' && !b.isPortal) ||
      blocks.find((b) => b.kind === 'drawer');
    return firstDrawer || null;
  };

  // Map to hold newly assigned items for each block id
  const newlyAssigned = new Map<string, DesktopItem[]>();
  for (const it of newItems) {
    const target = findTargetBlockForNewItem(it, existingBlocks);
    if (target) {
      const list = newlyAssigned.get(target.id) || [];
      list.push(it);
      newlyAssigned.set(target.id, list);
    }
  }

  // 4. Update blocks while keeping the exact same drawers, order, positions, and shifted items
  return existingBlocks.map((block) => {
    // If it's a widget, return as-is
    if (block.kind !== 'drawer') return block;

    // If it's the Downloads drawer, sync with latest downloads items if provided
    if (block.id === 'drawer-downloads' || block.title.toLowerCase() === 'downloads') {
      if (downloadsItems && downloadsItems.length > 0) {
        return {
          ...block,
          items: downloadsItems,
        };
      }
      return block;
    }

    // For general drawers:
    // Update existing items in-place (updating icon, targetPath, etc.)
    const updatedExistingItems: DesktopItem[] = [];
    for (const item of block.items || []) {
      const p = (item.fullPath || '').toLowerCase().trim();
      const n = (item.name || '').toLowerCase().trim();
      const fresh = (p ? scannedByPath.get(p) : null) || (n ? scannedByName.get(n) : null);

      // Check if it's a desktop file that was deleted
      const isDesktopPath = p.includes('\\desktop\\') || p.includes('/desktop/');
      if (isDesktopPath && !fresh && !item.isSystem) {
        // Item was removed from the desktop, omit it
        continue;
      }

      // Keep item in THIS drawer where the user placed/shifted it!
      updatedExistingItems.push({
        ...item,
        targetPath: fresh?.targetPath || item.targetPath,
        iconDataUrl: fresh && fresh.iconDataUrl ? fresh.iconDataUrl : item.iconDataUrl,
        customIconKey: fresh?.customIconKey || item.customIconKey,
        isSystem: item.isSystem ?? fresh?.isSystem,
        systemIconType: item.systemIconType || fresh?.systemIconType,
      });
    }

    // Append any newly discovered items assigned to this block
    const toAdd = newlyAssigned.get(block.id) || [];

    return {
      ...block,
      items: [...updatedExistingItems, ...toAdd],
    };
  });
}

