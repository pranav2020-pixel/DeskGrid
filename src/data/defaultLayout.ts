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
