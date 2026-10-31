# DeskGrid — Modern Windows Desktop Overlay & Drawer Manager

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6.svg?logo=windows)](https://microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-33.2.1-47848F.svg?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

**A sleek, translucent Windows desktop overlay and drawer organizer inspired by *iTop Easy Desktop* and *Stardock Fences*.**  
Organize apps, shortcuts, documents, and folders into magnetic, customizable drawers with real-time alignment rulers and live wallpaper support.

</div>

---

## ✨ Features

### 🗂️ Draggable, Namable & 8-Way Resizable Drawers
- **8-Direction Resizing:** Resize drawers from any edge or corner (`N, S, E, W, NE, NW, SE, SW`) with smooth minimum boundary guards.
- **Inline Renaming:** Double-click any drawer header (or click the edit pencil) to rename it.
- **Roll-Up / Collapse Mode:** Collapse drawers into compact title pills to free up desktop space.
- **Custom Tint & Opacity:** Fine-tune individual drawer opacities (10% to 100%) or adjust globally from the wallpaper dock slider.
- **Folder Portals:** Create collapsible portal drawers for directories like `Downloads` with auto-refreshing file contents.

### 🧲 Real-Time Magnetic Guide & Level Lines
- **Multi-Point Snapping:** Snaps to sibling edges, centers, and screen workArea boundaries with live cyan and violet guide lines.
- **Equal-Spacing Rulers:** Live pixel distance badges (`12px`, `14px`, `16px`) indicate equidistant alignment between neighboring drawers.
- **Dimension Matching:** Visual indicator glows when a resized drawer matches the exact width or height of adjacent drawers.
- **Smooth Push/Shift Mode:** Toggle **Shift Mode** (or hold `Shift` while dragging) to push neighboring drawers out of the way smoothly without collisions.
- **Snap Bypass:** Hold `Alt` while dragging or resizing to bypass magnetic snapping freely.

### 🎬 Smart Wallpaper & Live Video Engine
- **Active Lively Wallpaper Sync:** Automatically detects running [Lively Wallpaper](https://rocksdanister.github.io/lively/) videos and streams them at 60 FPS hardware acceleration directly inside DeskGrid.
- **Instant Windows Wallpaper Sync:** Monitors Windows Themes and Registry (`HKCU\Control Panel\Desktop\Wallpaper`) to refresh immediately when you change your wallpaper in Windows Settings.
- **Total Icon Cleanliness:** Covers raw, unorganized Windows desktop icons while DeskGrid is active, keeping your screen clutter-free.
- **100% Non-Destructive:** DeskGrid never modifies, deletes, or hides Windows Shell icons. When you switch to your original desktop, everything remains untouched.

### 🛡️ Non-Intrusive & Taskbar Safe
- **Strict WorkArea Bounding:** Clamped strictly above the Windows Taskbar (`screen.getPrimaryDisplay().workArea`). Your taskbar is never covered or overlapped.
- **Desktop Z-Order Pinning:** Stays pinned at `HWND_BOTTOM` behind all regular applications (browsers, IDEs, games) so they always stay on top.
- **System Tray Integration:** Runs cleanly in the Windows System Tray with instant toggle, rescan, and drawer management options.

### 📅 Built-In Desktop Widgets
- **Calendar & Schedule Planner:** Interactive weekly date picker and quick schedule list.
- **Quick Tools 2×4 Action Grid:** Fast shortcuts to Search, Add Drawer, Create Portal, Sync Desktop, Trigger Windows Snipping Tool, Auto-Shift, and Auto-Level.
- **Digital Clock & Live Weather Card:** Real-time clock and live temperature card (powered by Open-Meteo).

---

## 🚀 Getting Started

### Option A: Standalone Windows Installer (.exe)
Download the latest pre-compiled release from GitHub:
- **`DeskGrid Setup 1.0.0.exe`**: Full installer with desktop & start menu shortcuts.
- **`DeskGrid 1.0.0.exe`**: Portable standalone executable (no installation required).

### Option B: 1-Click Launch from Source (Windows)
Double-click **`Launch-DeskGrid.bat`** in the repository root. It will:
1. Automatically run `npm install` if dependencies are missing.
2. Build the production React frontend.
3. Create a `DeskGrid.lnk` shortcut on your Windows desktop with the custom high-res icon.
4. Launch DeskGrid immediately.

### Option C: Manual Build & Run

#### Prerequisites
- **Node.js** (v18 or higher) and **npm**
- **Windows 10 / 11**

#### Clone & Install
```bash
git clone https://github.com/pranav2020-pixel/DeskGrid.git
cd DeskGrid
npm install
```

#### Development Mode (Vite Hot-Reload + Electron)
```bash
npm run dev
```

#### Production Build & Run
```bash
npm start
```

#### Build Standalone `.exe` Installer
```bash
# Builds both the NSIS setup installer and the portable executable into dist-installer/
npm run dist
```

---

## ⌨️ Shortcuts & Controls

| Shortcut / Control | Action |
| :--- | :--- |
| **`Alt + D`** | **Toggle DeskGrid / Switch to Original Windows Desktop** |
| **`Ctrl + F`** | Open Desktop Search modal across all drawers |
| **Double-Click Header** | Roll-up / Collapse drawer into sleek title pill |
| **Double-Click Title** | Rename drawer inline |
| **Double-Click Item** | Launch file, shortcut, or app via native Windows Shell |
| **Hold `Shift` (or Shift ON)** | Smoothly push / shift neighboring drawers while dragging |
| **Hold `Alt`** | Temporarily bypass magnetic guide & level line snapping |
| **Double-Click Empty Desktop** | Minimize DeskGrid to reveal original desktop |
| **Right-Click Empty Desktop** | Open desktop context menu (Add drawer, align, settings) |

---

## 🏗️ Architecture

```
DeskGrid/
├── assets/                  # 256x256 high-resolution icons (.ico, .png)
├── electron/
│   ├── main.cjs             # Window lifecycle, HWND_BOTTOM z-order, wallpaper watcher, Shell API
│   └── preload.cjs          # Secure IPC contextBridge (deskgridAPI)
├── src/
│   ├── components/
│   │   ├── AlignmentGuides.tsx  # SVG magnetic guide lines, equal spacing rulers, dimension pills
│   │   ├── DesktopWidgets.tsx   # Calendar, Quick Tools, Clock, and Weather widgets
│   │   ├── DrawerBox.tsx        # 8-way resizable, draggable drawer container
│   │   └── RichItemIcon.tsx     # Vector icon renderer & native Windows thumbnail fallback
│   ├── engine/
│   │   └── alignmentEngine.ts   # Edge/center snap logic, gap calculations, overlap shifting
│   ├── data/
│   │   └── defaultLayout.ts     # Initial responsive layout generator & desktop scanner adapter
│   ├── types.ts                 # TypeScript data contracts & state interfaces
│   ├── App.tsx                  # Main canvas, state management, video background player
│   └── styles.css               # Modern glassmorphism & responsive drawer styles
├── Launch-DeskGrid.bat      # 1-Click launcher script for Windows
├── package.json             # Electron-builder scripts & dependencies
└── vite.config.ts           # Fast Vite build pipeline
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
