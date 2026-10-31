import React from 'react';
import {
  DesktopBlock,
  DimensionMatch,
  GuideLine,
  Rect,
  SpacingGuide,
} from '../types';
import { getEffectiveRect } from '../engine/alignmentEngine';

interface Props {
  activeBlockId: string | null;
  activeRect: Rect | null;
  guides: GuideLine[];
  spacings: SpacingGuide[];
  dimensionMatches: DimensionMatch[];
  allBlocks: DesktopBlock[];
  isShiftingMode: boolean;
}

export const AlignmentGuides: React.FC<Props> = ({
  activeBlockId,
  activeRect,
  guides,
  spacings,
  dimensionMatches,
  allBlocks,
  isShiftingMode,
}) => {
  if (!activeBlockId || !activeRect) return null;

  return (
    <svg
      className="alignment-guides-svg"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <filter id="guideGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Active Drawer Ghost Level Box Outline */}
      <rect
        x={activeRect.x}
        y={activeRect.y}
        width={activeRect.width}
        height={activeRect.height}
        rx={10}
        fill="rgba(56, 189, 248, 0.04)"
        stroke="#38bdf8"
        strokeWidth={1.5}
        strokeDasharray="5 3"
      />

      {/* 2. Dimension Match Highlights on Peer Drawers */}
      {dimensionMatches.map((dm) => {
        const peer = allBlocks.find((b) => b.id === dm.blockId);
        if (!peer) return null;
        const pRect = getEffectiveRect(peer);
        const badgeText = [
          dm.matchWidth ? `W: ${dm.width}px` : '',
          dm.matchHeight ? `H: ${dm.height}px` : '',
        ]
          .filter(Boolean)
          .join(' • ');

        return (
          <g key={`dm-${dm.blockId}`}>
            <rect
              x={pRect.x}
              y={pRect.y}
              width={pRect.width}
              height={pRect.height}
              rx={10}
              fill="rgba(52, 211, 153, 0.08)"
              stroke="#34d399"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            <g
              transform={`translate(${pRect.x + pRect.width / 2}, ${
                pRect.y + pRect.height / 2
              })`}
            >
              <rect
                x={-48}
                y={-11}
                width={96}
                height={22}
                rx={6}
                fill="#064e3b"
                stroke="#34d399"
                strokeWidth={1}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill="#a7f3d0"
                fontSize="10"
                fontWeight="700"
                fontFamily="Segoe UI, monospace"
              >
                = {badgeText}
              </text>
            </g>
          </g>
        );
      })}

      {/* 3. Edge & Center Level Guide Lines */}
      {guides.map((g) => {
        const isCenter = g.kind === 'center';
        const isScreen = g.kind === 'screen';
        const color = isCenter ? '#e879f9' : isScreen ? '#fbbf24' : '#38bdf8';

        if (g.orientation === 'vertical') {
          const midY = Math.round((g.start + g.end) / 2);
          return (
            <g key={g.id} filter="url(#guideGlow)">
              <line
                x1={g.position}
                y1={g.start}
                x2={g.position}
                y2={g.end}
                stroke={color}
                strokeWidth={1.6}
                strokeDasharray={isCenter ? '6 4' : undefined}
              />
              {/* Endpoint ticks */}
              <circle cx={g.position} cy={g.start + 6} r={3} fill={color} />
              <circle cx={g.position} cy={g.end - 6} r={3} fill={color} />
              {g.label && (
                <g transform={`translate(${g.position + 8}, ${Math.max(28, midY)})`}>
                  <rect
                    x={0}
                    y={-10}
                    width={g.label.length * 6.2 + 12}
                    height={19}
                    rx={4}
                    fill="rgba(15, 23, 42, 0.92)"
                    stroke={color}
                    strokeWidth={1}
                  />
                  <text
                    x={6}
                    y={3}
                    fill={color}
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="Segoe UI, monospace"
                  >
                    {g.label}
                  </text>
                </g>
              )}
            </g>
          );
        } else {
          const midX = Math.round((g.start + g.end) / 2);
          return (
            <g key={g.id} filter="url(#guideGlow)">
              <line
                x1={g.start}
                y1={g.position}
                x2={g.end}
                y2={g.position}
                stroke={color}
                strokeWidth={1.6}
                strokeDasharray={isCenter ? '6 4' : undefined}
              />
              {/* Endpoint ticks */}
              <circle cx={g.start + 6} cy={g.position} r={3} fill={color} />
              <circle cx={g.end - 6} cy={g.position} r={3} fill={color} />
              {g.label && (
                <g transform={`translate(${Math.max(20, midX - 42)}, ${g.position - 14})`}>
                  <rect
                    x={0}
                    y={-10}
                    width={g.label.length * 6.2 + 12}
                    height={19}
                    rx={4}
                    fill="rgba(15, 23, 42, 0.92)"
                    stroke={color}
                    strokeWidth={1}
                  />
                  <text
                    x={6}
                    y={3}
                    fill={color}
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="Segoe UI, monospace"
                  >
                    {g.label}
                  </text>
                </g>
              )}
            </g>
          );
        }
      })}

      {/* 4. Live Gap & Equal Spacing Rulers */}
      {spacings.map((s) => {
        const color = s.isEqualMatch ? '#34d399' : '#fbbf24';
        const midX = (s.x1 + s.x2) / 2;
        const midY = (s.y1 + s.y2) / 2;
        return (
          <g key={s.id}>
            <line
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            {s.orientation === 'horizontal' ? (
              <>
                <line x1={s.x1} y1={s.y1 - 6} x2={s.x1} y2={s.y1 + 6} stroke={color} strokeWidth={1.8} />
                <line x1={s.x2} y1={s.y2 - 6} x2={s.x2} y2={s.y2 + 6} stroke={color} strokeWidth={1.8} />
              </>
            ) : (
              <>
                <line x1={s.x1 - 6} y1={s.y1} x2={s.x1 + 6} y2={s.y1} stroke={color} strokeWidth={1.8} />
                <line x1={s.x2 - 6} y1={s.y2} x2={s.x2 + 6} y2={s.y2} stroke={color} strokeWidth={1.8} />
              </>
            )}
            <g transform={`translate(${midX}, ${midY})`}>
              <rect
                x={-20}
                y={-9}
                width={40}
                height={18}
                rx={4}
                fill="rgba(15, 23, 42, 0.94)"
                stroke={color}
                strokeWidth={1}
              />
              <text
                x={0}
                y={3.5}
                textAnchor="middle"
                fill={color}
                fontSize="9.5"
                fontWeight="700"
                fontFamily="Segoe UI, monospace"
              >
                {s.distance}px
              </text>
            </g>
          </g>
        );
      })}

      {/* 5. Floating Telemetry Pill on Active Drawer */}
      <g
        transform={`translate(${activeRect.x}, ${
          activeRect.y > 30 ? activeRect.y - 24 : activeRect.y + activeRect.height + 8
        })`}
      >
        <rect
          x={0}
          y={0}
          width={isShiftingMode ? 245 : 176}
          height={20}
          rx={5}
          fill="rgba(15, 23, 42, 0.94)"
          stroke="#38bdf8"
          strokeWidth={1}
        />
        <text
          x={8}
          y={13.5}
          fill="#f8fafc"
          fontSize="10"
          fontWeight="600"
          fontFamily="Segoe UI, monospace"
        >
          {`X:${activeRect.x} Y:${activeRect.y} • ${activeRect.width}×${activeRect.height}`}
          {isShiftingMode ? ' [SHIFT]' : ''}
        </text>
      </g>
    </svg>
  );
};
