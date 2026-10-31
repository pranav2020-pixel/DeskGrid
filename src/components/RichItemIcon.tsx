import React from 'react';
import { DesktopItem } from '../types';

interface Props {
  item: DesktopItem;
  size?: number;
}

export const RichItemIcon: React.FC<Props> = ({ item, size = 42 }) => {
  const [imgError, setImgError] = React.useState(false);

  const renderShortcutBadge = () => {
    if (!item.isShortcut) return null;
    return (
      <span
        className="shortcut-arrow-badge"
        title="Shortcut"
        aria-hidden="true"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <rect width="12" height="12" rx="2.5" fill="#ffffff" />
          <path
            d="M3.5 8.5C3.5 6 5 4.5 8.5 4.5M8.5 4.5L6.3 2.7M8.5 4.5L6.3 6.3"
            stroke="#0284c7"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  };

  // 1. Windows 11 Golden Folder Icon always takes priority for directories
  if (item.isDirectory) {
    return (
      <div className="icon-visual-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path
            d="M4 11C4 8.79086 5.79086 7 8 7H17.3431C18.404 7 19.4214 7.42143 20.1716 8.17157L22.8284 10.8284C23.5786 11.5786 24.596 12 25.6569 12H40C42.2091 12 44 13.7909 44 16V37C44 39.2091 42.2091 41 40 41H8C5.79086 41 4 39.2091 4 37V11Z"
            fill="#D99B26"
          />
          <rect x="8" y="13" width="32" height="10" rx="2" fill="#FFFDF7" />
          <rect x="11" y="15.5" width="16" height="2" rx="1" fill="#CBD5E1" />
          <path
            d="M4 18C4 16.3431 5.34315 15 7 15H41C42.6569 15 44 16.3431 44 18V37C44 39.2091 42.2091 41 40 41H8C5.79086 41 4 39.2091 4 37V18Z"
            fill="url(#winFolderGrad)"
          />
          <defs>
            <linearGradient id="winFolderGrad" x1="24" y1="15" x2="24" y2="41" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFDA6A" />
              <stop offset="1" stopColor="#F5B027" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  const key = (item.customIconKey || item.systemIconType || item.name || '').toLowerCase();
  const hasCuratedVector =
    /vmware|mysql|docker|oracle|hackerrank|leetcode|codeforces|vscode|visual studio|antigravity|kimi|github|gitbash|git bash|vercel|epic|modrinth|minecraft|rockstar|asphalt|instagram|javascript|udemy|classroom|sheets|vlc|edge|chrome|typing|itop|this-pc|network|recycle-bin|control-panel/.test(
      key
    ) || key === 'js';

  // 2. Exact native icon extracted from the desktop item (ALWAYS takes priority to match original desktop)
  if (item.iconDataUrl && !imgError) {
    return (
      <div className="icon-visual-wrap" style={{ width: size, height: size }}>
        <img
          src={item.iconDataUrl}
          alt={item.name}
          width={size}
          height={size}
          draggable={false}
          className="native-file-icon"
          onError={() => setImgError(true)}
        />
        {renderShortcutBadge()}
      </div>
    );
  }

  // 3. Curated Vector Brand & System Icons matching the user's screenshot
  const renderVectorIcon = () => {
    if (key.includes('vmware')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="9" fill="#F97316" />
          <rect x="11" y="11" width="16" height="16" rx="3" stroke="#FFF" strokeWidth="3.5" />
          <rect x="21" y="21" width="16" height="16" rx="3" stroke="#0EA5E9" strokeWidth="3.5" fill="#F97316" />
        </svg>
      );
    }
    if (key.includes('mysql')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="9" fill="#0284C7" />
          <path
            d="M14 33C14 23 21 15 31 14C28 19 29 25 34 29C28 29 24 31 21 35"
            stroke="#FFF"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="27" cy="18" r="1.8" fill="#FFF" />
        </svg>
      );
    }
    if (key.includes('docker')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" fill="#0284C7" />
          <path d="M11 26H35C36 32 30 36 22 36C15 36 11 32 11 26Z" fill="#FFF" />
          <rect x="15" y="20" width="4" height="4" fill="#FFF" />
          <rect x="20" y="20" width="4" height="4" fill="#FFF" />
          <rect x="25" y="20" width="4" height="4" fill="#FFF" />
          <rect x="20" y="15" width="4" height="4" fill="#FFF" />
          <rect x="25" y="15" width="4" height="4" fill="#FFF" />
        </svg>
      );
    }
    if (key.includes('oracle')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="4" y="8" width="40" height="32" rx="8" fill="#18181B" />
          <rect x="10" y="16" width="28" height="16" rx="8" stroke="#EF4444" strokeWidth="4" />
        </svg>
      );
    }
    if (key.includes('hackerrank')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="8" fill="#111827" />
          <text x="10" y="31" fill="#FFF" fontSize="20" fontWeight="800" fontFamily="Segoe UI, sans-serif">
            H
          </text>
          <rect x="26" y="15" width="10" height="18" rx="1.5" fill="#22C55E" />
        </svg>
      );
    }
    if (key.includes('leetcode')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="9" fill="#18181B" />
          <path d="M26 13L15 24L26 35" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 24H34" stroke="#E5E7EB" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    }
    if (key.includes('codeforces')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="8" y="20" width="8" height="20" rx="2" fill="#FACC15" />
          <rect x="20" y="11" width="8" height="29" rx="2" fill="#3B82F6" />
          <rect x="32" y="16" width="8" height="24" rx="2" fill="#EF4444" />
        </svg>
      );
    }
    if (key.includes('vscode') || key.includes('visual studio')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path d="M34 6L14 25L8 20L5 22L14 31L34 42L42 38V10L34 6Z" fill="#0284C7" />
          <path d="M34 6L14 25L34 34V6Z" fill="#38BDF8" />
        </svg>
      );
    }
    if (key.includes('antigravity')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#1E1B4B" />
          <path
            d="M12 36C16 24 20 12 24 12C28 12 32 24 36 36"
            stroke="url(#agyGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="agyGrad" x1="12" y1="36" x2="36" y2="12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="0.5" stopColor="#EC4899" />
              <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>
      );
    }
    if (key.includes('kimi')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#111827" />
          <text x="14" y="32" fill="#FFF" fontSize="22" fontWeight="800" fontFamily="Segoe UI, sans-serif">
            K
          </text>
          <circle cx="34" cy="15" r="3.5" fill="#38BDF8" />
        </svg>
      );
    }
    if (key.includes('github')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" fill="#18181B" />
          <circle cx="24" cy="23" r="11" fill="#FFF" />
          <path d="M16 14L19 20M32 14L29 20" stroke="#FFF" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    }
    if (key.includes('gitbash') || key.includes('git bash')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path d="M24 4L44 24L24 44L4 24L24 4Z" fill="#F97316" />
          <circle cx="24" cy="16" r="3" fill="#FFF" />
          <circle cx="24" cy="30" r="3" fill="#FFF" />
          <circle cx="31" cy="23" r="3" fill="#FFF" />
          <path d="M24 16V30M24 19L31 23" stroke="#FFF" strokeWidth="2.5" />
        </svg>
      );
    }
    if (key.includes('vercel')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="9" fill="#09090B" />
          <path d="M24 12L37 35H11L24 12Z" fill="#FFF" />
        </svg>
      );
    }
    if (key.includes('epic')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="6" y="4" width="36" height="40" rx="6" fill="#18181B" stroke="#3F3F46" strokeWidth="1.5" />
          <text x="11" y="24" fill="#FFF" fontSize="11" fontWeight="900" fontFamily="Segoe UI, sans-serif">
            EPIC
          </text>
          <text x="10" y="34" fill="#A1A1AA" fontSize="7.5" fontWeight="700" fontFamily="Segoe UI, sans-serif">
            GAMES
          </text>
        </svg>
      );
    }
    if (key.includes('modrinth')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="19" stroke="#22C55E" strokeWidth="4.5" fill="#052E16" />
          <circle cx="24" cy="24" r="9" stroke="#4ADE80" strokeWidth="3.5" />
        </svg>
      );
    }
    if (key.includes('minecraft')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="6" y="6" width="36" height="36" rx="4" fill="#78350F" />
          <rect x="6" y="6" width="36" height="13" rx="3" fill="#22C55E" />
          <rect x="12" y="16" width="6" height="5" fill="#22C55E" />
          <rect x="26" y="16" width="7" height="6" fill="#22C55E" />
        </svg>
      );
    }
    if (key.includes('rockstar')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="5" y="5" width="38" height="38" rx="7" fill="#F59E0B" />
          <text x="11" y="33" fill="#000" fontSize="24" fontWeight="900" fontFamily="Segoe UI, sans-serif">
            R
          </text>
          <polygon points="33,24 35,29 40,29 36,32 37,37 33,34 29,37 30,32 26,29 31,29" fill="#FFF" />
        </svg>
      );
    }
    if (key.includes('asphalt')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="5" y="5" width="38" height="38" rx="7" fill="#1E293B" />
          <path d="M10 32L24 12L38 32H30L24 22L18 32H10Z" fill="#F97316" />
        </svg>
      );
    }
    if (key.includes('instagram')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="5" y="5" width="38" height="38" rx="11" fill="url(#igGrad)" />
          <rect x="12" y="12" width="24" height="24" rx="7" stroke="#FFF" strokeWidth="3" />
          <circle cx="24" cy="24" r="5.5" stroke="#FFF" strokeWidth="3" />
          <circle cx="31" cy="17" r="1.8" fill="#FFF" />
          <defs>
            <linearGradient id="igGrad" x1="5" y1="43" x2="43" y2="5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="0.5" stopColor="#EC4899" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      );
    }
    if (key === 'js' || key.includes('javascript')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="5" y="5" width="38" height="38" rx="6" fill="#2563EB" />
          <text x="11" y="32" fill="#FFF" fontSize="21" fontWeight="800" fontFamily="Segoe UI, sans-serif">
            JS
          </text>
        </svg>
      );
    }
    if (key.includes('udemy')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" fill="#FFF" />
          <path d="M18 16L24 11L30 16" stroke="#A855F7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 21V29C17 33 20 36 24 36C28 36 31 33 31 29V21" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }
    if (key.includes('classroom')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="5" y="8" width="38" height="32" rx="5" fill="#FACC15" />
          <rect x="9" y="12" width="30" height="24" rx="2" fill="#16A34A" />
          <circle cx="24" cy="21" r="3.5" fill="#FFF" />
          <path d="M17 31C17 27.5 20 26 24 26C28 26 31 27.5 31 31" fill="#FFF" />
        </svg>
      );
    }
    if (key.includes('sheets')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="9" y="5" width="30" height="38" rx="4" fill="#16A34A" />
          <rect x="15" y="17" width="18" height="16" stroke="#FFF" strokeWidth="2.5" />
          <line x1="15" y1="25" x2="33" y2="25" stroke="#FFF" strokeWidth="2" />
          <line x1="24" y1="17" x2="24" y2="33" stroke="#FFF" strokeWidth="2" />
        </svg>
      );
    }
    if (key.includes('vlc')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path d="M21 8H27L36 38H12L21 8Z" fill="#F97316" />
          <path d="M18 18H30L32 24H16L18 18Z" fill="#FFF" />
          <path d="M15 29H33L34.5 34H13.5L15 29Z" fill="#FFF" />
          <rect x="8" y="37" width="32" height="5" rx="2" fill="#EA580C" />
        </svg>
      );
    }
    if (key.includes('typing')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="19" fill="#1D4ED8" stroke="#60A5FA" strokeWidth="2" />
          <text x="15" y="33" fill="#FFF" fontSize="24" fontWeight="900" fontFamily="Segoe UI, sans-serif">
            T
          </text>
        </svg>
      );
    }
    if (key.includes('itop') || key.includes('deskgrid')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="6" y="6" width="16" height="16" rx="4" fill="#38BDF8" />
          <rect x="26" y="6" width="16" height="16" rx="4" fill="#818CF8" />
          <rect x="6" y="26" width="16" height="16" rx="4" fill="#A855F7" />
          <rect x="26" y="26" width="16" height="16" rx="4" fill="#EC4899" />
        </svg>
      );
    }
    if (key.includes('edge')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="19" fill="url(#edgeGrad)" />
          <path d="M14 28C14 19 22 14 30 17C24 18 20 22 21 28C22 33 29 35 35 32" stroke="#FFF" strokeWidth="4" strokeLinecap="round" />
          <defs>
            <linearGradient id="edgeGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="0.6" stopColor="#0284C7" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      );
    }
    if (key.includes('chrome')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="19" fill="#FACC15" />
          <path d="M9 13C13 7 18 5 24 5C32 5 39 10 42 17H24" fill="#EF4444" />
          <path d="M6 16C5 19 5 22 5 25C6 34 13 42 23 43L31 28L15 28" fill="#22C55E" />
          <circle cx="24" cy="24" r="8.5" fill="#3B82F6" stroke="#FFF" strokeWidth="3" />
        </svg>
      );
    }
    if (key.includes('this-pc')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="5" y="8" width="38" height="26" rx="3" fill="#0284C7" stroke="#38BDF8" strokeWidth="2" />
          <rect x="18" y="35" width="12" height="4" fill="#94A3B8" />
          <rect x="13" y="39" width="22" height="3" rx="1.5" fill="#CBD5E1" />
        </svg>
      );
    }
    if (key.includes('network')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="12" y="14" width="28" height="20" rx="3" fill="#0284C7" stroke="#7DD3FC" strokeWidth="2" />
          <circle cx="17" cy="18" r="9" fill="#38BDF8" opacity="0.85" />
          <rect x="20" y="35" width="12" height="4" fill="#94A3B8" />
        </svg>
      );
    }
    if (key.includes('recycle-bin')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path d="M11 12H37L34 41H14L11 12Z" fill="#BAE6FD" stroke="#38BDF8" strokeWidth="2" />
          <rect x="9" y="8" width="30" height="4" rx="2" fill="#7DD3FC" />
          <path d="M20 22L24 18L28 22M28 28L24 32L20 28" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    }
    if (key.includes('control-panel')) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="5" y="9" width="38" height="30" rx="4" fill="#0284C7" />
          <circle cx="16" cy="24" r="6" fill="#FACC15" />
          <rect x="26" y="17" width="11" height="4" rx="1" fill="#FFF" />
          <rect x="26" y="24" width="11" height="4" rx="1" fill="#7DD3FC" />
          <rect x="26" y="31" width="8" height="3" rx="1" fill="#FFF" />
        </svg>
      );
    }

    // Default Document / File icon
    const ext = (item.extension || '').replace('.', '').toUpperCase() || 'APP';
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path d="M10 6H30L38 14V42H10V6Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
        <path d="M30 6V14H38" fill="#E2E8F0" />
        <rect x="14" y="20" width="20" height="3" rx="1" fill="#38BDF8" />
        <rect x="14" y="26" width="16" height="3" rx="1" fill="#94A3B8" />
        <text x="14" y="38" fill="#0F172A" fontSize="8.5" fontWeight="800" fontFamily="Segoe UI, sans-serif">
          {ext.slice(0, 4)}
        </text>
      </svg>
    );
  };

  return (
    <div className="icon-visual-wrap" style={{ width: size, height: size }}>
      {renderVectorIcon()}
      {renderShortcutBadge()}
    </div>
  );
};
