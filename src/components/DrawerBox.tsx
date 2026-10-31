import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Folder,
} from 'lucide-react';
import { DesktopBlock, DesktopItem } from '../types';
import { RichItemIcon } from './RichItemIcon';

interface Props {
  block: DesktopBlock;
  isActive: boolean;
  searchQuery: string;
  onStartMove: (e: React.MouseEvent, block: DesktopBlock) => void;
  onStartResize: (e: React.MouseEvent, block: DesktopBlock, dir: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onToggleCollapse: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onAddItems: (blockId: string, mode: 'files' | 'folder') => void;
  onOpenItem: (item: DesktopItem) => void;
  onShowInFolder: (item: DesktopItem) => void;
  onRemoveItem: (blockId: string, itemId: string) => void;
  onMoveItemBetweenDrawers: (
    sourceBlockId: string,
    itemId: string,
    targetBlockId: string
  ) => void;
  onDropExternalFiles: (blockId: string, files: FileList) => void;
  onChangeAccent: (blockId: string, color: string) => void;
  onChangeOpacity?: (blockId: string, opacity: number) => void;
  globalOpacity?: number;
}

const ACCENT_PRESETS = [
  'rgba(10, 12, 16, 0.78)',
  'rgba(15, 23, 42, 0.80)',
  'rgba(6, 38, 53, 0.78)',
  'rgba(24, 16, 48, 0.78)',
  'rgba(6, 44, 34, 0.78)',
  'rgba(45, 18, 24, 0.78)',
];

export const DrawerBox: React.FC<Props> = ({
  block,
  isActive,
  searchQuery,
  onStartMove,
  onStartResize,
  onRename,
  onToggleCollapse,
  onToggleLock,
  onDeleteBlock,
  onAddItems,
  onOpenItem,
  onShowInFolder,
  onRemoveItem,
  onMoveItemBetweenDrawers,
  onDropExternalFiles,
  onChangeAccent,
  onChangeOpacity,
  globalOpacity = 0.78,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(block.title);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [itemContextMenu, setItemContextMenu] = useState<{
    x: number;
    y: number;
    item: DesktopItem;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleDraft(block.title);
  }, [block.title]);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    const closeMenu = () => {
      setItemContextMenu(null);
      setShowColorMenu(false);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const commitRename = () => {
    setIsEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== block.title) {
      onRename(block.id, trimmed);
    } else {
      setTitleDraft(block.title);
    }
  };

  const filteredItems = searchQuery.trim()
    ? block.items.filter((it) =>
        it.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : block.items;

  const effectiveHeight = block.collapsed ? 38 : block.height;
  const currentOpacity = block.opacity !== undefined ? block.opacity : globalOpacity;
  
  // Format accent color with drawer's opacity
  let bgStyle = block.accentColor || 'rgba(10, 12, 16, 0.78)';
  if (bgStyle.startsWith('rgba(')) {
    bgStyle = bgStyle.replace(/[\d\.]+\)$/, `${currentOpacity})`);
  } else if (bgStyle.startsWith('rgb(')) {
    bgStyle = bgStyle.replace('rgb(', 'rgba(').replace(')', `, ${currentOpacity})`);
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Check internal item transfer
    const transferData = e.dataTransfer.getData('application/deskgrid-item');
    if (transferData) {
      try {
        const { sourceBlockId, itemId } = JSON.parse(transferData);
        if (sourceBlockId && itemId && sourceBlockId !== block.id) {
          onMoveItemBetweenDrawers(sourceBlockId, itemId, block.id);
        }
      } catch (_) {}
      return;
    }

    // External files dropped from Windows Explorer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropExternalFiles(block.id, e.dataTransfer.files);
    }
  };

  return (
    <div
      className={`desktop-drawer ${isActive ? 'is-active-dragging' : ''} ${
        block.collapsed ? 'is-collapsed' : ''
      } ${isDragOver ? 'is-drop-target' : ''} ${block.locked ? 'is-locked' : ''}`}
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        height: effectiveHeight,
        zIndex: isActive ? 999 : block.zIndex,
        background: bgStyle,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drawer Header Bar (Draggable & Namable) */}
      <div
        className="drawer-header"
        onMouseDown={(e) => {
          if (
            (e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('input')
          ) {
            return;
          }
          onStartMove(e, block);
        }}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest('.drawer-title-text')) {
            setIsEditingTitle(true);
          } else {
            onToggleCollapse(block.id);
          }
        }}
      >
        {/* Left hover actions */}
        <div className="drawer-header-actions left">
          <button
            type="button"
            className="drawer-icon-btn"
            title="Add Shortcut / App"
            onClick={(e) => {
              e.stopPropagation();
              onAddItems(block.id, 'files');
            }}
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            className="drawer-icon-btn"
            title="Add Folder"
            onClick={(e) => {
              e.stopPropagation();
              onAddItems(block.id, 'folder');
            }}
          >
            <Folder size={12} />
          </button>
          <div className="color-picker-wrap">
            <button
              type="button"
              className="drawer-icon-btn"
              title="Drawer Tint & Rename"
              onClick={(e) => {
                e.stopPropagation();
                setShowColorMenu((v) => !v);
              }}
            >
              <Edit3 size={12} />
            </button>
            {showColorMenu && (
              <div
                className="drawer-color-popover"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="popover-row-label">Drawer Tint</div>
                <div className="color-swatches">
                  {ACCENT_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="color-swatch-btn"
                      style={{ background: c }}
                      onClick={() => {
                        onChangeAccent(block.id, c);
                        setShowColorMenu(false);
                      }}
                    />
                  ))}
                </div>
                
                <div className="popover-row-label" style={{ marginTop: '8px' }}>
                  Drawer Opaqueness ({Math.round(currentOpacity * 100)}%)
                </div>
                <div className="drawer-opacity-slider-row">
                  <input
                    type="range"
                    min="0.10"
                    max="1.0"
                    step="0.05"
                    value={currentOpacity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (onChangeOpacity) onChangeOpacity(block.id, val);
                    }}
                    className="drawer-opacity-slider"
                  />
                </div>

                <button
                  type="button"
                  className="popover-rename-btn"
                  style={{ marginTop: '8px' }}
                  onClick={() => {
                    setShowColorMenu(false);
                    setIsEditingTitle(true);
                  }}
                >
                  Rename Drawer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center Title (Supports Portal Folder icon like "Downloads") */}
        <div className="drawer-title-container">
          {block.isPortal && (
            <FolderOpen size={15} className="portal-folder-icon" />
          )}
          {isEditingTitle ? (
            <input
              ref={inputRef}
              type="text"
              className="drawer-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setTitleDraft(block.title);
                  setIsEditingTitle(false);
                }
              }}
            />
          ) : (
            <span
              className="drawer-title-text"
              title="Double-click to rename drawer • Drag to move"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              {block.title}
            </span>
          )}
        </div>

        {/* Right hover actions */}
        <div className="drawer-header-actions right">
          <button
            type="button"
            className="drawer-icon-btn"
            title={block.collapsed ? 'Expand Drawer' : 'Roll Up / Collapse Drawer'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(block.id);
            }}
          >
            {block.collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            type="button"
            className={`drawer-icon-btn ${block.locked ? 'active-lock' : ''}`}
            title={block.locked ? 'Unlock Drawer' : 'Lock Position & Size'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(block.id);
            }}
          >
            {block.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
          <button
            type="button"
            className="drawer-icon-btn danger"
            title="Remove Drawer"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteBlock(block.id);
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Drawer Content Grid */}
      {!block.collapsed && (
        <div className="drawer-content-scroller">
          {filteredItems.length === 0 ? (
            <div className="drawer-empty-state">
              <span>Drop files/shortcuts here or click +</span>
            </div>
          ) : (
            <div className="drawer-items-grid">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="desktop-item-tile"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      'application/deskgrid-item',
                      JSON.stringify({ sourceBlockId: block.id, itemId: item.id })
                    );
                  }}
                  onDoubleClick={() => onOpenItem(item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setItemContextMenu({
                      x: e.nativeEvent.offsetX,
                      y: e.nativeEvent.offsetY,
                      item,
                    });
                  }}
                  title={`${item.name}\nDouble-click to open`}
                >
                  <RichItemIcon item={item} size={42} />
                  <span className="desktop-item-label">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Item Context Menu */}
      {itemContextMenu && (
        <div
          className="item-context-menu"
          style={{
            left: Math.min(block.width - 150, Math.max(8, itemContextMenu.x)),
            top: Math.min(effectiveHeight - 110, Math.max(32, itemContextMenu.y)),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onOpenItem(itemContextMenu.item);
              setItemContextMenu(null);
            }}
          >
            <ExternalLink size={12} /> Open
          </button>
          <button
            type="button"
            onClick={() => {
              onShowInFolder(itemContextMenu.item);
              setItemContextMenu(null);
            }}
          >
            <FolderOpen size={12} /> Open File Location
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              onRemoveItem(block.id, itemContextMenu.item.id);
              setItemContextMenu(null);
            }}
          >
            <Trash2 size={12} /> Remove from Drawer
          </button>
        </div>
      )}

      {/* 8-Way Resize Handles (when unlocked and expanded) */}
      {!block.locked && !block.collapsed && (
        <>
          <div
            className="resize-handle dir-n"
            onMouseDown={(e) => onStartResize(e, block, 'n')}
          />
          <div
            className="resize-handle dir-s"
            onMouseDown={(e) => onStartResize(e, block, 's')}
          />
          <div
            className="resize-handle dir-e"
            onMouseDown={(e) => onStartResize(e, block, 'e')}
          />
          <div
            className="resize-handle dir-w"
            onMouseDown={(e) => onStartResize(e, block, 'w')}
          />
          <div
            className="resize-handle dir-nw"
            onMouseDown={(e) => onStartResize(e, block, 'nw')}
          />
          <div
            className="resize-handle dir-ne"
            onMouseDown={(e) => onStartResize(e, block, 'ne')}
          />
          <div
            className="resize-handle dir-sw"
            onMouseDown={(e) => onStartResize(e, block, 'sw')}
          />
          <div
            className="resize-handle dir-se"
            onMouseDown={(e) => onStartResize(e, block, 'se')}
          />
        </>
      )}
    </div>
  );
};
