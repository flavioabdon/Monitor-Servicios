'use client';

import React, { useState, useMemo } from 'react';
import { Zap, Clock } from 'lucide-react';

export interface ServiceCheck {
  id?: string;
  status: 'UP' | 'DEGRADED' | 'DOWN' | 'TIMEOUT';
  responseTime: number;
  httpCode?: number;
  pingAvg?: number;
  pingLoss?: number;
  sslDaysLeft?: number;
  timestamp: string;
  error?: string;
}

interface TvServiceSparklineProps {
  checks: ServiceCheck[];
  height?: number;
}

export default function TvServiceSparkline({ checks, height = 40 }: TvServiceSparklineProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Checks come in descending order (newest first), sort ascending (oldest -> newest) for timeline
  const sortedChecks = useMemo(() => {
    if (!checks || checks.length === 0) return [];
    return [...checks].reverse();
  }, [checks]);

  const pointsData = useMemo(() => {
    if (sortedChecks.length === 0) return [];

    const times = sortedChecks.map((c) => {
      const val = c.responseTime ?? (c.pingAvg ? Math.round(c.pingAvg) : 0);
      return Math.max(0, val);
    });

    const min = Math.min(...times);
    const max = Math.max(...times, 1);
    const range = max - min === 0 ? 1 : max - min;

    return sortedChecks.map((c, idx) => {
      const val = c.responseTime ?? (c.pingAvg ? Math.round(c.pingAvg) : 0);
      return {
        check: c,
        value: val,
        idx,
        // Normalized 0..1
        normY: (val - min) / range,
      };
    });
  }, [sortedChecks]);

  if (pointsData.length === 0) {
    return (
      <div className="h-9 w-full flex items-center justify-center bg-slate-50/60 rounded-lg border border-dashed border-slate-200 text-[10px] text-slate-400 font-mono">
        <Clock className="w-3 h-3 mr-1 opacity-50" /> Sin registros
      </div>
    );
  }

  const width = 260; // coordinate space
  const padTop = 6;
  const padBottom = 8;
  const padX = 10;
  const chartHeight = height;
  const innerHeight = chartHeight - padTop - padBottom;
  const innerWidth = width - padX * 2;

  const stepX = pointsData.length > 1 ? innerWidth / (pointsData.length - 1) : innerWidth / 2;

  const coords = pointsData.map((p, i) => {
    const x = padX + (pointsData.length === 1 ? innerWidth / 2 : i * stepX);
    const y = padTop + innerHeight - p.normY * innerHeight;
    return { ...p, x, y };
  });

  // Build SVG path
  const linePath = coords.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    return `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Build SVG area fill path
  const areaPath = coords.length > 1
    ? `${linePath} L ${coords[coords.length - 1].x},${chartHeight - padBottom + 2} L ${coords[0].x},${chartHeight - padBottom + 2} Z`
    : '';

  const activePoint = hoveredIdx !== null ? coords[hoveredIdx] : null;

  const getPointColor = (status: string) => {
    switch (status) {
      case 'UP':
        return '#16a34a'; // Green
      case 'DEGRADED':
        return '#f59e0b'; // Amber
      case 'DOWN':
      case 'TIMEOUT':
        return '#dc2626'; // Red
      default:
        return '#64748b'; // Slate
    }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return ts;
    }
  };

  return (
    <div className="relative w-full overflow-visible">
      {/* SVG Sparkline */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="w-full h-auto overflow-visible cursor-pointer"
          style={{ maxHeight: height }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={`grad-compact-${coords[0]?.check?.id || 'spark'}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#245b87" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#245b87" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          {areaPath && (
            <path d={areaPath} fill={`url(#grad-compact-${coords[0]?.check?.id || 'spark'})`} />
          )}

          {/* Connecting Line */}
          {coords.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#245b87"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-85"
            />
          )}

          {/* Hover Vertical Guide */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padTop - 2}
              x2={activePoint.x}
              y2={chartHeight - padBottom + 3}
              stroke="#245b87"
              strokeWidth="1"
              strokeDasharray="2,2"
              className="opacity-70"
            />
          )}

          {/* Colored Interactive Points */}
          {coords.map((pt) => {
            const isHovered = hoveredIdx === pt.idx;
            const color = getPointColor(pt.check.status);

            return (
              <g
                key={pt.idx}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  setHoveredIdx(pt.idx);
                }}
                className="transition-transform"
              >
                {/* Hit area */}
                <circle cx={pt.x} cy={pt.y} r="7" fill="transparent" />

                {/* Outer ring on hover */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5.5"
                    fill={color}
                    opacity="0.3"
                    className="animate-ping"
                  />
                )}

                {/* White border circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? '4' : '2.8'}
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth={isHovered ? '2' : '1.5'}
                  className="transition-all duration-100"
                />

                {/* Center point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? '2' : '1.4'}
                  fill={color}
                  className="transition-all duration-100"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {activePoint && (
          <div
            className="absolute z-30 pointer-events-none -top-1 px-2 py-1 bg-slate-900/95 text-white text-[9px] rounded-lg shadow-xl border border-slate-700 whitespace-nowrap font-mono"
            style={{
              left: `${Math.min(Math.max(10, (activePoint.x / width) * 100), 90)}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="flex items-center space-x-1 font-bold">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: getPointColor(activePoint.check.status) }}
              />
              <span>{activePoint.check.status}</span>
              <span className="text-emerald-400">{activePoint.value}ms</span>
              {activePoint.check.httpCode && (
                <span className="text-amber-300">({activePoint.check.httpCode})</span>
              )}
            </div>
            <div className="text-slate-300 text-[8px]">
              {formatTime(activePoint.check.timestamp)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
