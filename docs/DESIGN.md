# DeskGrid — Windows Desktop Overlay & Drawer Manager

## 1. Understanding Summary
- **What is being built:** A native Windows Desktop Overlay Manager (inspired by iTop Easy Desktop / Stardock Fences) that renders translucent, customizable drawers ("boxes") and desktop widgets directly on the Windows desktop work area.
- **Core Drawer Mechanics:** Every drawer can be freely dragged, resized via 8-direction handles, renamed inline, rolled up/collapsed (like the *Downloads* bar), locked, customized in color/opacity, or added/removed at will.
- **Smart Guide & Level Lines:** While moving, dragging, or resizing any drawer or widget, real-time alignment guide lines (edge-to-edge, center-to-center, equal gap spacing with pixel distance badges, and dimension-matching indicators) appear with magnetic snapping (`6px` threshold).
- **Auto-Scan & Categorization:** Automatically scans the Windows Desktop (`User\Desktop` and `Public\Desktop`) to import real shortcuts (`.lnk`, `.url`), executables, folders, and files, extracting their native icons (`app.getFileIcon`) and organizing them into categorized drawers (*Programs*, *Folders*, *Files & Documents*, *Coding*, *AI*, *Games*, *DB and VMs*, *Study*, *Socials*).
- **Taskbar Isolation:** Strictly bounded to `screen.getPrimaryDisplay().workArea` so the Windows Taskbar is never covered, blocked, or affected. Runs cleanly from the Windows System Tray (`skipTaskbar: true`).
- **Desktop Widgets:** Includes draggable, snap-aligned widgets matching the reference layout: **Calendar & Schedule planner**, **Quick Tools 2×4 action grid**, **Digital Clock**, and **Weather card**.

## 2. Assumptions (Non-Functional Requirements)
- **Performance:** 60 FPS drag/resize and `< 2ms` per-frame alignment & spacing computation.
- **Scale:** Handles 10–30 drawers/widgets and 100–500 desktop shortcuts/files smoothly with automatic local JSON persistence (`desktop-layout.json`).
- **Security & Privacy:** 100% local execution with no telemetry.
- **Browser / Runtime Support:** Runs in Electron (modern Chromium), allowing standard modern CSS (`scrollbar-color`, `scrollbar-width`, `backdrop-filter`, `field-sizing: content`) with clean progressive fallbacks.

## 3. Decision Log
| Decision | Alternatives Considered | Why Chosen |
| :--- | :--- | :--- |
| **Electron + React + TypeScript + Vite** | Python/PyQt6, Tauri | Best support for 60 FPS glassmorphism, native `app.getFileIcon` shortcut icon extraction, and rich SVG/Canvas alignment guides. |
| **Strict `workArea` Bounding + System Tray** | `fullscreen: true` window | Ensures the Windows Taskbar is 100% untouched, responsive, and never overlapped. |
| **Magnetic Guide & Level Engine (6px snap)** | Fixed CSS grid only | Gives complete freeform freedom while making it effortless to align edges, centers, equal gaps, and matching dimensions. |

## 4. Architecture Overview
- **`electron/main.cjs`**:
  - Manages the frameless transparent `BrowserWindow` bounded strictly to `screen.getPrimaryDisplay().workArea`.
  - Listens to `display-metrics-changed` to resize dynamically if the taskbar moves or changes size.
  - Provides IPC handlers for scanning `Desktop` directories, extracting native icons via `app.getFileIcon()`, resolving `.lnk`/`.url` files, opening files/folders/apps via `shell.openPath()`, opening file locations via `shell.showItemInFolder()`, picking folders for Folder Portals, and persisting layout state.
  - Manages a Windows System Tray icon with quick actions (Show/Hide Overlay, Reset Layout, Rescan Desktop, Lock/Unlock Drawers, Quit).
  - Supports dynamic mouse click-through (`setIgnoreMouseEvents`) on empty desktop wallpaper space so native desktop wallpaper interactions work when not hovering a drawer, toolbar, or context menu.
- **`src/engine/alignmentEngine.ts`**:
  - Pure geometric solver computing:
    1. **Edge & Center Snap Lines** (`left`, `right`, `top`, `bottom`, `centerX`, `centerY`) between the active rect and all peer rects + screen workArea center/margins.
    2. **Equal Spacing Guides** (detecting equal horizontal/vertical distances `A <-> B <-> C` and rendering dashed measurement lines with pixel pills).
    3. **Dimension Match Badges** (highlighting peers that share the exact width or height during resize).
- **`src/components/`**:
  - `DrawerBox.tsx`: Translucent drawer with header bar, inline rename, roll-up/collapse toggle, color/tint picker, item count, add item button, 8-way resize handles, and responsive icon grid.
  - `Widgets.tsx`: Calendar & Schedule widget, Quick Tools 2×4 grid, Digital Clock card, and Live Weather card.
  - `AlignmentGuides.tsx`: High-precision SVG overlay rendering cyan/magenta snap lines, intersection crosshairs, distance pills, and live `(X, Y)` / `W × H` HUD badges.
