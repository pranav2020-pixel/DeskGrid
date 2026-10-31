export type ItemType = 'shortcut' | 'folder' | 'file' | 'system' | 'url';

export interface DesktopItem {
  id: string;
  name: string;
  fullPath: string;
  targetPath?: string;
  extension?: string;
  isDirectory?: boolean;
  isShortcut?: boolean;
  isSystem?: boolean;
  systemIconType?: 'this-pc' | 'recycle-bin' | 'network' | 'control-panel' | 'app' | 'code' | 'game' | 'db' | 'social' | 'study';
  customIconKey?: string;
  iconDataUrl?: string | null;
  category?: string;
}

export type BlockKind =
  | 'drawer'
  | 'widget-calendar'
  | 'widget-tools'
  | 'widget-clock'
  | 'widget-weather';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopBlock extends Rect {
  id: string;
  title: string;
  kind: BlockKind;
  collapsed?: boolean;
  expandedHeight?: number;
  locked?: boolean;
  accentColor?: string;
  opacity?: number;
  iconSize?: 'sm' | 'md' | 'lg';
  isPortal?: boolean;
  portalPath?: string;
  items: DesktopItem[];
  zIndex: number;
}

export interface ScheduleEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  title: string;
  completed: boolean;
}

export interface GuideLine {
  id: string;
  orientation: 'vertical' | 'horizontal';
  position: number; // x for vertical, y for horizontal
  start: number;    // y1 for vertical, x1 for horizontal
  end: number;      // y2 for vertical, x2 for horizontal
  kind: 'edge' | 'center' | 'screen';
  label?: string;
}

export interface SpacingGuide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distance: number;
  isEqualMatch: boolean;
}

export interface DimensionMatch {
  blockId: string;
  matchWidth: boolean;
  matchHeight: boolean;
  width: number;
  height: number;
}

export interface SnapResult {
  rect: Rect;
  guides: GuideLine[];
  spacings: SpacingGuide[];
  dimensionMatches: DimensionMatch[];
}

export interface DeskGridState {
  blocks: DesktopBlock[];
  schedules: ScheduleEntry[];
  weatherCity: string;
  snapEnabled: boolean;
  autoShiftOnOverlap: boolean;
  globalOpacity: number;
  showGridDots: boolean;
  wallpaperMode?: 'passthrough' | 'static-sync' | 'custom-media';
  customMedia?: { url: string; isVideo: boolean; title?: string } | null;
}
