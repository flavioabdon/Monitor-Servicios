'use client';

import React, { useState, useMemo } from 'react';
import { Clock } from 'lucide-react';

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

export default function TvServiceSparkline({ checks, height = 32 }: TvServiceSparklineProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Ordenar cronológicamente (más antiguo -> más reciente)
  const sortedChecks = useMemo(() => {
    if (!checks || checks.length === 0) return [];
    return [...checks].reverse();
  }, [checks]);

  const { pointsData, minVal, maxVal } = useMemo(() => {
    if (sortedChecks.length === 0) return { pointsData: [], minVal: 0, maxVal: 0 };

    const values = sortedChecks.map((c) => {
      const val = c.responseTime ?? (c.pingAvg ? Math.round(c.pingAvg) : 0);
      return Math.max(0, val);
    });

    const min = 0; // Base en 0 estilo Google Cloud
    const calculatedMax = Math.max(...values, 10);
    const max = Math.ceil(calculatedMax * 1.15);
    const range = max - min;

    const data = sortedChecks.map((c, idx) => {
      const val = c.responseTime ?? (c.pingAvg ? Math.round(c.pingAvg) : 0);
      return {
        check: c,
        value: val,
        idx,
        normY: Math.min(1, Math.max(0, (val - min) / range)),
      };
    });

    return { pointsData: data, minVal: min, maxVal: calculatedMax };
  }, [sortedChecks]);

  if (pointsData.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center bg-slate-50/50 rounded border border-dashed border-slate-200 text-[9px] text-slate-400 font-mono"
      >
        <Clock className="w-2.5 h-2.5 mr-1 opacity-40" /> Sin métricas
      </div>
    );
  }

  // Dimensiones compactas del gráfico (coordinadas SVG reducidas al 50%)
  const width = 240;
  const chartHeight = height;
  const padLeft = 36; // Espacio para texto de latencia
  const padRight = 6;
  const padTop = 4;
  const padBottom = 13; // Espacio para leyendas de tiempo

  const plotWidth = width - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const stepX = pointsData.length > 1 ? plotWidth / (pointsData.length - 1) : plotWidth / 2;

  const coords = pointsData.map((p, i) => {
    const x = padLeft + (pointsData.length === 1 ? plotWidth / 2 : i * stepX);
    const y = padTop + plotHeight - p.normY * plotHeight;
    return { ...p, x, y };
  });

  // Construcción de la línea continua (sin puntos)
  let linePath = '';
  if (coords.length === 1) {
    linePath = `M ${padLeft},${coords[0].y} L ${padLeft + plotWidth},${coords[0].y}`;
  } else {
    linePath = coords.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      return `${acc} L ${pt.x},${pt.y}`;
    }, '');
  }

  // Área sombreada bajo la línea estilo Cloud Monitoring
  const areaPath = coords.length > 1
    ? `${linePath} L ${coords[coords.length - 1].x},${padTop + plotHeight} L ${coords[0].x},${padTop + plotHeight} Z`
    : '';

  const activePoint = hoveredIdx !== null ? coords[hoveredIdx] : null;

  // Paleta de colores Google Cloud
  const latestStatus = sortedChecks[sortedChecks.length - 1]?.status;
  const lineColor = latestStatus === 'DOWN' || latestStatus === 'TIMEOUT'
    ? '#d93025' // Google Red
    : latestStatus === 'DEGRADED'
    ? '#ea8600' // Google Amber
    : '#1a73e8'; // Google Blue

  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms)}ms`;
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const startTime = sortedChecks[0]?.timestamp ? formatTime(sortedChecks[0].timestamp) : '';
  const endTime = sortedChecks[sortedChecks.length - 1]?.timestamp
    ? formatTime(sortedChecks[sortedChecks.length - 1].timestamp)
    : '';
  const midTime = sortedChecks.length >= 4 && sortedChecks[Math.floor(sortedChecks.length / 2)]?.timestamp
    ? formatTime(sortedChecks[Math.floor(sortedChecks.length / 2)].timestamp)
    : '';

  const uniqueId = `gcloud-chart-${sortedChecks[0]?.id || Math.random().toString(36).substring(2, 7)}`;

  return (
    <div className="relative w-full overflow-visible select-none">
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          style={{ maxHeight: height }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={uniqueId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.16" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* ─── GRID HORIZONTAL (EJE Y) ─── */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={width - padRight}
            y2={padTop}
            stroke="#e2e8f0"
            strokeDasharray="2,2"
            strokeWidth="0.7"
          />
          <line
            x1={padLeft}
            y1={padTop + plotHeight}
            x2={width - padRight}
            y2={padTop + plotHeight}
            stroke="#cbd5e1"
            strokeWidth="0.8"
          />
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={padTop + plotHeight}
            stroke="#cbd5e1"
            strokeWidth="0.8"
          />

          {/* ─── LEYENDAS EJE Y ─── */}
          <text
            x={padLeft - 3}
            y={padTop + 4}
            fill="#475569"
            fontSize="10"
            fontWeight="600"
            fontFamily="monospace"
            textAnchor="end"
          >
            {formatLatency(maxVal)}
          </text>
          <text
            x={padLeft - 3}
            y={padTop + plotHeight + 1}
            fill="#64748b"
            fontSize="10"
            fontWeight="600"
            fontFamily="monospace"
            textAnchor="end"
          >
            0
          </text>

          {/* ─── ÁREA Y LÍNEA (SIN PUNTOS) ─── */}
          {areaPath && (
            <path d={areaPath} fill={`url(#${uniqueId})`} />
          )}

          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ─── LEYENDAS EJE X (TIEMPO) ─── */}
          {startTime && (
            <text
              x={padLeft}
              y={chartHeight - 2}
              fill="#64748b"
              fontSize="9.5"
              fontWeight="600"
              fontFamily="monospace"
              textAnchor="start"
            >
              {startTime}
            </text>
          )}

          {midTime && (
            <text
              x={padLeft + plotWidth / 2}
              y={chartHeight - 2}
              fill="#94a3b8"
              fontSize="9.5"
              fontWeight="500"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {midTime}
            </text>
          )}

          {endTime && (
            <text
              x={width - padRight}
              y={chartHeight - 2}
              fill="#64748b"
              fontSize="9.5"
              fontWeight="600"
              fontFamily="monospace"
              textAnchor="end"
            >
              {endTime}
            </text>
          )}

          {/* ─── INTERACCIÓN HOVER: GUÍA VERTICAL ESTILO GCLOUD ─── */}
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={padTop + plotHeight}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.8"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="2.5"
                fill="#ffffff"
                stroke={lineColor}
                strokeWidth="1.5"
              />
            </>
          )}

          {/* Áreas transparentes de captura de hover */}
          {coords.map((pt) => (
            <rect
              key={pt.idx}
              x={pt.x - stepX / 2}
              y={padTop}
              width={stepX}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(pt.idx)}
            />
          ))}
        </svg>

        {/* ─── TOOLTIP FLOTANTE ESTILO GOOGLE CLOUD ─── */}
        {activePoint && (
          <div
            className="absolute z-30 pointer-events-none -top-1 px-2 py-1 bg-slate-900/95 text-white text-[9px] rounded shadow-lg border border-slate-700 whitespace-nowrap font-mono"
            style={{
              left: `${Math.min(Math.max(15, (activePoint.x / width) * 100), 85)}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="flex items-center space-x-1 font-semibold">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    activePoint.check.status === 'UP'
                      ? '#16a34a'
                      : activePoint.check.status === 'DEGRADED'
                      ? '#ea8600'
                      : '#d93025',
                }}
              />
              <span className="text-white font-bold">{activePoint.value}ms</span>
              {activePoint.check.httpCode && (
                <span className="text-slate-400">({activePoint.check.httpCode})</span>
              )}
            </div>
            <div className="text-slate-400 text-[8px]">
              {new Date(activePoint.check.timestamp).toLocaleTimeString('es-BO', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
