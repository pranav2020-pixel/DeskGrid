import {
  DesktopBlock,
  DimensionMatch,
  GuideLine,
  Rect,
  SnapResult,
  SpacingGuide,
} from '../types';

const SNAP_THRESHOLD = 7;
const SPACING_SNAP_THRESHOLD = 5;
const STANDARD_GAPS = [12, 16, 20];
const COLLAPSED_HEADER_HEIGHT = 38;

export function getEffectiveRect(block: DesktopBlock): Rect {
  return {
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.collapsed ? COLLAPSED_HEADER_HEIGHT : block.height,
  };
}

/**
 * Clamp a rectangle strictly within the Windows workArea so it never touches or covers the Taskbar
 */
export function clampToWorkArea(rect: Rect, workArea: { width: number; height: number }): Rect {
  const maxW = Math.max(82, Math.min(rect.width, workArea.width - 16));
  const maxH = Math.max(COLLAPSED_HEADER_HEIGHT, Math.min(rect.height, workArea.height - 16));
  const x = Math.max(4, Math.min(rect.x, workArea.width - maxW - 4));
  const y = Math.max(4, Math.min(rect.y, workArea.height - maxH - 4));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(maxW), height: Math.round(maxH) };
}

/**
 * Computes magnetic snapping, alignment guide lines (level lines), live distance rulers,
 * equal-gap spacing indicators, and dimension match badges during drag or 8-way resize.
 */
export function computeAlignmentAndGuides(
  activeId: string,
  proposedRect: Rect,
  allBlocks: DesktopBlock[],
  workArea: { width: number; height: number },
  mode: 'move' | 'resize',
  resizeDir?: string,
  snapEnabled = true
): SnapResult {
  const peers = allBlocks
    .filter((b) => b.id !== activeId)
    .map((b) => ({ id: b.id, title: b.title, ...getEffectiveRect(b) }));

  let rect = clampToWorkArea({ ...proposedRect }, workArea);

  const guides: GuideLine[] = [];
  const spacings: SpacingGuide[] = [];
  const dimensionMatches: DimensionMatch[] = [];

  if (!snapEnabled) {
    return { rect, guides, spacings, dimensionMatches };
  }

  // 1. Dimension matching during resize (width / height level match)
  if (mode === 'resize') {
    for (const peer of peers) {
      let matchWidth = false;
      let matchHeight = false;

      if (
        resizeDir &&
        (resizeDir.includes('e') || resizeDir.includes('w')) &&
        Math.abs(rect.width - peer.width) <= SNAP_THRESHOLD
      ) {
        if (resizeDir.includes('w')) {
          rect.x = rect.x + (rect.width - peer.width);
        }
        rect.width = peer.width;
        matchWidth = true;
      }

      if (
        resizeDir &&
        (resizeDir.includes('s') || resizeDir.includes('n')) &&
        Math.abs(rect.height - peer.height) <= SNAP_THRESHOLD
      ) {
        if (resizeDir.includes('n')) {
          rect.y = rect.y + (rect.height - peer.height);
        }
        rect.height = peer.height;
        matchHeight = true;
      }

      if (matchWidth || matchHeight) {
        dimensionMatches.push({
          blockId: peer.id,
          matchWidth,
          matchHeight,
          width: peer.width,
          height: peer.height,
        });
      }
    }
  }

  // 2. Vertical Guide Lines (X-axis: Left, CenterX, Right)
  let bestDx = SNAP_THRESHOLD + 1;
  let snappedX: number | null = null;
  let snappedWidth: number | null = null;

  const activeXPoints =
    mode === 'move'
      ? [
          { type: 'left', val: rect.x, offset: 0, label: 'LEFT LEVEL' },
          { type: 'center', val: rect.x + rect.width / 2, offset: rect.width / 2, label: 'CENTER X' },
          { type: 'right', val: rect.x + rect.width, offset: rect.width, label: 'RIGHT LEVEL' },
        ]
      : [
          ...(resizeDir?.includes('w')
            ? [{ type: 'left', val: rect.x, offset: 0, label: 'LEFT LEVEL' }]
            : []),
          ...(resizeDir?.includes('e')
            ? [{ type: 'right', val: rect.x + rect.width, offset: rect.width, label: 'RIGHT LEVEL' }]
            : []),
        ];

  // Screen margin & center X candidates
  const screenXTargets = [
    { val: 16, start: 0, end: workArea.height, kind: 'screen' as const, label: 'MARGIN 16px' },
    {
      val: Math.round(workArea.width / 2),
      start: 0,
      end: workArea.height,
      kind: 'center' as const,
      label: 'SCREEN CENTER X',
    },
    {
      val: workArea.width - 16,
      start: 0,
      end: workArea.height,
      kind: 'screen' as const,
      label: 'MARGIN 16px',
    },
  ];

  for (const pt of activeXPoints) {
    // Check peers
    for (const peer of peers) {
      const peerTargets = [
        { val: peer.x, kind: 'edge' as const },
        { val: peer.x + peer.width / 2, kind: 'center' as const },
        { val: peer.x + peer.width, kind: 'edge' as const },
      ];
      for (const target of peerTargets) {
        const diff = Math.abs(pt.val - target.val);
        if (diff <= bestDx) {
          bestDx = diff;
          if (mode === 'move') {
            snappedX = Math.round(target.val - pt.offset);
          } else if (pt.type === 'left') {
            const rightEdge = rect.x + rect.width;
            snappedX = Math.round(target.val);
            snappedWidth = Math.round(rightEdge - target.val);
          } else if (pt.type === 'right') {
            snappedWidth = Math.round(target.val - rect.x);
          }
        }
      }
    }

    // Check screen targets
    for (const st of screenXTargets) {
      const diff = Math.abs(pt.val - st.val);
      if (diff <= bestDx) {
        bestDx = diff;
        if (mode === 'move') {
          snappedX = Math.round(st.val - pt.offset);
        }
      }
    }
  }

  if (snappedX !== null) rect.x = snappedX;
  if (snappedWidth !== null && snappedWidth >= 140) rect.width = snappedWidth;

  // 3. Horizontal Guide Lines (Y-axis: Top, CenterY, Bottom)
  let bestDy = SNAP_THRESHOLD + 1;
  let snappedY: number | null = null;
  let snappedHeight: number | null = null;

  const activeYPoints =
    mode === 'move'
      ? [
          { type: 'top', val: rect.y, offset: 0, label: 'TOP LEVEL' },
          { type: 'center', val: rect.y + rect.height / 2, offset: rect.height / 2, label: 'CENTER Y' },
          { type: 'bottom', val: rect.y + rect.height, offset: rect.height, label: 'BOTTOM LEVEL' },
        ]
      : [
          ...(resizeDir?.includes('n')
            ? [{ type: 'top', val: rect.y, offset: 0, label: 'TOP LEVEL' }]
            : []),
          ...(resizeDir?.includes('s')
            ? [{ type: 'bottom', val: rect.y + rect.height, offset: rect.height, label: 'BOTTOM LEVEL' }]
            : []),
        ];

  const screenYTargets = [
    { val: 16, start: 0, end: workArea.width, kind: 'screen' as const, label: 'TOP MARGIN' },
    {
      val: Math.round(workArea.height / 2),
      start: 0,
      end: workArea.width,
      kind: 'center' as const,
      label: 'SCREEN CENTER Y',
    },
    {
      val: workArea.height - 16,
      start: 0,
      end: workArea.width,
      kind: 'screen' as const,
      label: 'BOTTOM MARGIN',
    },
  ];

  for (const pt of activeYPoints) {
    for (const peer of peers) {
      const peerTargets = [
        { val: peer.y, kind: 'edge' as const },
        { val: peer.y + peer.height / 2, kind: 'center' as const },
        { val: peer.y + peer.height, kind: 'edge' as const },
      ];
      for (const target of peerTargets) {
        const diff = Math.abs(pt.val - target.val);
        if (diff <= bestDy) {
          bestDy = diff;
          if (mode === 'move') {
            snappedY = Math.round(target.val - pt.offset);
          } else if (pt.type === 'top') {
            const bottomEdge = rect.y + rect.height;
            snappedY = Math.round(target.val);
            snappedHeight = Math.round(bottomEdge - target.val);
          } else if (pt.type === 'bottom') {
            snappedHeight = Math.round(target.val - rect.y);
          }
        }
      }
    }

    for (const st of screenYTargets) {
      const diff = Math.abs(pt.val - st.val);
      if (diff <= bestDy) {
        bestDy = diff;
        if (mode === 'move') {
          snappedY = Math.round(st.val - pt.offset);
        }
      }
    }
  }

  if (snappedY !== null) rect.y = snappedY;
  if (snappedHeight !== null && snappedHeight >= COLLAPSED_HEADER_HEIGHT) rect.height = snappedHeight;

  // 4. Equal-Spacing & Standard Gap Snapping (when moving)
  if (mode === 'move') {
    // Find nearest neighbor to the left, right, top, bottom that overlaps on the perpendicular axis
    const overlapYPeers = peers.filter(
      (p) => Math.min(rect.y + rect.height, p.y + p.height) - Math.max(rect.y, p.y) > 20
    );
    const overlapXPeers = peers.filter(
      (p) => Math.min(rect.x + rect.width, p.x + p.width) - Math.max(rect.x, p.x) > 20
    );

    // Nearest Left peer
    const leftPeers = overlapYPeers
      .filter((p) => p.x + p.width <= rect.x + 12)
      .sort((a, b) => b.x + b.width - (a.x + a.width));
    const nearestLeft = leftPeers[0];

    // Nearest Right peer
    const rightPeers = overlapYPeers
      .filter((p) => p.x >= rect.x + rect.width - 12)
      .sort((a, b) => a.x - b.x);
    const nearestRight = rightPeers[0];

    // Nearest Top peer
    const topPeers = overlapXPeers
      .filter((p) => p.y + p.height <= rect.y + 12)
      .sort((a, b) => b.y + b.height - (a.y + a.height));
    const nearestTop = topPeers[0];

    // Nearest Bottom peer
    const bottomPeers = overlapXPeers
      .filter((p) => p.y >= rect.y + rect.height - 12)
      .sort((a, b) => a.y - b.y);
    const nearestBottom = bottomPeers[0];

    // If not already hard-snapped on X, check standard gap or equal gap between left & right neighbors
    if (snappedX === null) {
      if (nearestLeft && nearestRight) {
        const totalSpace = nearestRight.x - (nearestLeft.x + nearestLeft.width) - rect.width;
        const centeredGap = Math.round(totalSpace / 2);
        const currentLeftGap = rect.x - (nearestLeft.x + nearestLeft.width);
        if (centeredGap > 0 && Math.abs(currentLeftGap - centeredGap) <= SPACING_SNAP_THRESHOLD) {
          rect.x = nearestLeft.x + nearestLeft.width + centeredGap;
        }
      } else if (nearestLeft) {
        const currentGap = rect.x - (nearestLeft.x + nearestLeft.width);
        for (const stdGap of STANDARD_GAPS) {
          if (Math.abs(currentGap - stdGap) <= 4) {
            rect.x = nearestLeft.x + nearestLeft.width + stdGap;
            break;
          }
        }
      } else if (nearestRight) {
        const currentGap = nearestRight.x - (rect.x + rect.width);
        for (const stdGap of STANDARD_GAPS) {
          if (Math.abs(currentGap - stdGap) <= 4) {
            rect.x = nearestRight.x - rect.width - stdGap;
            break;
          }
        }
      }
    }

    // If not already hard-snapped on Y, check standard gap or equal gap between top & bottom neighbors
    if (snappedY === null) {
      if (nearestTop && nearestBottom) {
        const totalSpace = nearestBottom.y - (nearestTop.y + nearestTop.height) - rect.height;
        const centeredGap = Math.round(totalSpace / 2);
        const currentTopGap = rect.y - (nearestTop.y + nearestTop.height);
        if (centeredGap > 0 && Math.abs(currentTopGap - centeredGap) <= SPACING_SNAP_THRESHOLD) {
          rect.y = nearestTop.y + nearestTop.height + centeredGap;
        }
      } else if (nearestTop) {
        const currentGap = rect.y - (nearestTop.y + nearestTop.height);
        for (const stdGap of STANDARD_GAPS) {
          if (Math.abs(currentGap - stdGap) <= 4) {
            rect.y = nearestTop.y + nearestTop.height + stdGap;
            break;
          }
        }
      } else if (nearestBottom) {
        const currentGap = nearestBottom.y - (rect.y + rect.height);
        for (const stdGap of STANDARD_GAPS) {
          if (Math.abs(currentGap - stdGap) <= 4) {
            rect.y = nearestBottom.y - rect.height - stdGap;
            break;
          }
        }
      }
    }

    // Emit live horizontal spacing rulers for nearby neighbors (within 100px)
    if (nearestLeft) {
      const gap = Math.round(rect.x - (nearestLeft.x + nearestLeft.width));
      if (gap >= 0 && gap <= 110) {
        const midY = Math.round(
          (Math.max(rect.y, nearestLeft.y) +
            Math.min(rect.y + rect.height, nearestLeft.y + nearestLeft.height)) /
            2
        );
        spacings.push({
          id: `space-left-${nearestLeft.id}`,
          orientation: 'horizontal',
          x1: nearestLeft.x + nearestLeft.width,
          y1: midY,
          x2: rect.x,
          y2: midY,
          distance: gap,
          isEqualMatch: STANDARD_GAPS.includes(gap),
        });
      }
    }

    if (nearestRight) {
      const gap = Math.round(nearestRight.x - (rect.x + rect.width));
      if (gap >= 0 && gap <= 110) {
        const midY = Math.round(
          (Math.max(rect.y, nearestRight.y) +
            Math.min(rect.y + rect.height, nearestRight.y + nearestRight.height)) /
            2
        );
        spacings.push({
          id: `space-right-${nearestRight.id}`,
          orientation: 'horizontal',
          x1: rect.x + rect.width,
          y1: midY,
          x2: nearestRight.x,
          y2: midY,
          distance: gap,
          isEqualMatch: STANDARD_GAPS.includes(gap),
        });
      }
    }

    if (nearestTop) {
      const gap = Math.round(rect.y - (nearestTop.y + nearestTop.height));
      if (gap >= 0 && gap <= 110) {
        const midX = Math.round(
          (Math.max(rect.x, nearestTop.x) +
            Math.min(rect.x + rect.width, nearestTop.x + nearestTop.width)) /
            2
        );
        spacings.push({
          id: `space-top-${nearestTop.id}`,
          orientation: 'vertical',
          x1: midX,
          y1: nearestTop.y + nearestTop.height,
          x2: midX,
          y2: rect.y,
          distance: gap,
          isEqualMatch: STANDARD_GAPS.includes(gap),
        });
      }
    }

    if (nearestBottom) {
      const gap = Math.round(nearestBottom.y - (rect.y + rect.height));
      if (gap >= 0 && gap <= 110) {
        const midX = Math.round(
          (Math.max(rect.x, nearestBottom.x) +
            Math.min(rect.x + rect.width, nearestBottom.x + nearestBottom.width)) /
            2
        );
        spacings.push({
          id: `space-bottom-${nearestBottom.id}`,
          orientation: 'vertical',
          x1: midX,
          y1: rect.y + rect.height,
          x2: midX,
          y2: nearestBottom.y,
          distance: gap,
          isEqualMatch: STANDARD_GAPS.includes(gap),
        });
      }
    }
  }

  rect = clampToWorkArea(rect, workArea);

  // 5. Collect all active Vertical & Horizontal Level Lines that match the final snapped rect
  const finalXAnchors = [
    { val: rect.x, kind: 'edge' as const, label: 'LEFT' },
    { val: Math.round(rect.x + rect.width / 2), kind: 'center' as const, label: 'CENTER X' },
    { val: rect.x + rect.width, kind: 'edge' as const, label: 'RIGHT' },
  ];

  for (const anchor of finalXAnchors) {
    const matchedPeers = peers.filter(
      (p) =>
        Math.abs(p.x - anchor.val) <= 1 ||
        Math.abs(Math.round(p.x + p.width / 2) - anchor.val) <= 1 ||
        Math.abs(p.x + p.width - anchor.val) <= 1
    );

    if (matchedPeers.length > 0) {
      const minY = Math.min(rect.y, ...matchedPeers.map((p) => p.y)) - 14;
      const maxY =
        Math.max(rect.y + rect.height, ...matchedPeers.map((p) => p.y + p.height)) + 14;
      guides.push({
        id: `v-guide-${anchor.val}-${anchor.label}`,
        orientation: 'vertical',
        position: anchor.val,
        start: Math.max(0, minY),
        end: Math.min(workArea.height, maxY),
        kind: anchor.kind,
        label: `${anchor.label} (${anchor.val}px)`,
      });
    } else {
      for (const st of screenXTargets) {
        if (Math.abs(st.val - anchor.val) <= 1) {
          guides.push({
            id: `v-screen-${st.val}`,
            orientation: 'vertical',
            position: st.val,
            start: 0,
            end: workArea.height,
            kind: st.kind,
            label: st.label,
          });
        }
      }
    }
  }

  const finalYAnchors = [
    { val: rect.y, kind: 'edge' as const, label: 'TOP LEVEL' },
    { val: Math.round(rect.y + rect.height / 2), kind: 'center' as const, label: 'CENTER Y' },
    { val: rect.y + rect.height, kind: 'edge' as const, label: 'BOTTOM LEVEL' },
  ];

  for (const anchor of finalYAnchors) {
    const matchedPeers = peers.filter(
      (p) =>
        Math.abs(p.y - anchor.val) <= 1 ||
        Math.abs(Math.round(p.y + p.height / 2) - anchor.val) <= 1 ||
        Math.abs(p.y + p.height - anchor.val) <= 1
    );

    if (matchedPeers.length > 0) {
      const minX = Math.min(rect.x, ...matchedPeers.map((p) => p.x)) - 14;
      const maxX =
        Math.max(rect.x + rect.width, ...matchedPeers.map((p) => p.x + p.width)) + 14;
      guides.push({
        id: `h-guide-${anchor.val}-${anchor.label}`,
        orientation: 'horizontal',
        position: anchor.val,
        start: Math.max(0, minX),
        end: Math.min(workArea.width, maxX),
        kind: anchor.kind,
        label: `${anchor.label} (${anchor.val}px)`,
      });
    } else {
      for (const st of screenYTargets) {
        if (Math.abs(st.val - anchor.val) <= 1) {
          guides.push({
            id: `h-screen-${st.val}`,
            orientation: 'horizontal',
            position: st.val,
            start: 0,
            end: workArea.width,
            kind: st.kind,
            label: st.label,
          });
        }
      }
    }
  }

  return { rect, guides, spacings, dimensionMatches };
}

/**
 * Smart Shifting / Collision Resolution:
 * When autoShiftOnOverlap is enabled (or Shift is held while moving), overlapping drawers
 * smoothly shift away along the shortest vector to maintain a clean 14px gap without overlapping!
 */
export function resolveOverlapsByShifting(
  activeId: string,
  blocks: DesktopBlock[],
  workArea: { width: number; height: number }
): DesktopBlock[] {
  const result = blocks.map((b) => ({ ...b }));
  const GAP = 14;

  for (let pass = 0; pass < 4; pass++) {
    let movedAny = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;
        // Never move the active block or locked blocks
        const a = result[i];
        const b = result[j];
        if (b.id === activeId || b.locked) continue;

        const rectA = getEffectiveRect(a);
        const rectB = getEffectiveRect(b);

        const overlapX =
          Math.min(rectA.x + rectA.width + GAP / 2, rectB.x + rectB.width + GAP / 2) -
          Math.max(rectA.x - GAP / 2, rectB.x - GAP / 2);
        const overlapY =
          Math.min(rectA.y + rectA.height + GAP / 2, rectB.y + rectB.height + GAP / 2) -
          Math.max(rectA.y - GAP / 2, rectB.y - GAP / 2);

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            const pushRight = rectB.x + rectB.width / 2 >= rectA.x + rectA.width / 2;
            b.x = pushRight ? rectA.x + rectA.width + GAP : rectA.x - rectB.width - GAP;
          } else {
            const pushDown = rectB.y + rectB.height / 2 >= rectA.y + rectA.height / 2;
            b.y = pushDown ? rectA.y + rectA.height + GAP : rectA.y - rectB.height - GAP;
          }
          const clamped = clampToWorkArea(getEffectiveRect(b), workArea);
          b.x = clamped.x;
          b.y = clamped.y;
          movedAny = true;
        }
      }
    }
    if (!movedAny) break;
  }

  return result;
}
