'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  RefreshCw,
  Zap,
  Shield,
  Layers,
  Filter,
  BarChart2,
  ExternalLink,
  ChevronDown,
  Info,
  Play
} from 'lucide-react';
import { ServiceAPI } from '@/lib/api';

interface ServiceMetricsModalProps {
  service: any;
  isOpen: boolean;
  onClose: () => void;
  onTriggerProbe?: (serviceId: string) => void;
}

export const ServiceMetricsModal: React.FC<ServiceMetricsModalProps> = ({
  service,
  isOpen,
  onClose,
  onTriggerProbe,
}) => {
  const [period, setPeriod] = useState<string>('24h');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UP' | 'DEGRADED' | 'DOWN'>('ALL');
  const [activeTab, setActiveTab] = useState<'chart' | 'logs'>('chart');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [historyData, setHistoryData] = useState<any>(null);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  // Initialize custom dates with default 24h range
  useEffect(() => {
    const now = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toIsoLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setCustomTo(toIsoLocal(now));
    setCustomFrom(toIsoLocal(yesterday));
  }, []);

  const fetchHistory = async () => {
    if (!service?.id) return;
    try {
      setLoading(true);
      const params: any = {};
      if (period === 'custom') {
        params.from = customFrom ? new Date(customFrom).toISOString() : undefined;
        params.to = customTo ? new Date(customTo).toISOString() : undefined;
        params.period = 'custom';
      } else {
        params.period = period;
      }

      const data = await ServiceAPI.getHistory(service.id, params);
      setHistoryData(data);
      if (data.checks && data.checks.length > 0) {
        // Default selected point to latest check
        setSelectedPoint(data.checks[data.checks.length - 1]);
      } else {
        setSelectedPoint(null);
      }
    } catch (err) {
      console.error('Error fetching service history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && service?.id) {
      fetchHistory();
    }
  }, [isOpen, service?.id, period]);

  const handleApplyCustomDates = () => {
    if (period === 'custom') {
      fetchHistory();
    } else {
      setPeriod('custom');
    }
  };

  // Filter checks based on status filter
  const filteredChecks = useMemo(() => {
    if (!historyData?.checks) return [];
    if (statusFilter === 'ALL') return historyData.checks;
    if (statusFilter === 'DOWN') {
      return historyData.checks.filter((c: any) => c.status === 'DOWN' || c.status === 'TIMEOUT');
    }
    return historyData.checks.filter((c: any) => c.status === statusFilter);
  }, [historyData?.checks, statusFilter]);

  if (!isOpen || !service) return null;

  // Chart coordinate calculations
  const chartHeight = 220;
  const chartWidth = 700;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };

  const validPoints = filteredChecks.map((c: any) => ({
    ...c,
    value: c.responseTime ?? (c.pingAvg ? Math.round(c.pingAvg) : 0),
    date: new Date(c.timestamp),
  }));

  const maxVal = Math.max(
    ...validPoints.map((p: any) => p.value),
    service.slowThresholdMs || 1000,
    100
  );
  const minVal = 0;

  const minDate = validPoints.length > 0 ? validPoints[0].date.getTime() : Date.now() - 24 * 3600 * 1000;
  const maxDate = validPoints.length > 0 ? validPoints[validPoints.length - 1].date.getTime() : Date.now();
  const dateSpan = Math.max(maxDate - minDate, 1);

  const getX = (date: Date) => {
    const ratio = (date.getTime() - minDate) / dateSpan;
    return padding.left + ratio * (chartWidth - padding.left - padding.right);
  };

  const getY = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal);
    return chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom);
  };

  // Generate SVG path for line and area
  const linePoints = validPoints.map((p: any) => `${getX(p.date)},${getY(p.value)}`).join(' ');
  const areaPath = validPoints.length > 0
    ? `M ${getX(validPoints[0].date)},${chartHeight - padding.bottom} L ${linePoints.replace(/ /g, ' L ')} L ${getX(validPoints[validPoints.length - 1].date)},${chartHeight - padding.bottom} Z`
    : '';

  // Generate SLA Threshold Y position
  const slowThresholdY = service.slowThresholdMs ? getY(service.slowThresholdMs) : null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Top Accent Gradient Ribbon */}
        <div className="h-1.5 bg-gradient-to-r from-[#790026] via-[#B73852] to-[#16a34a]" />

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL HEADER */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="p-5 md:px-7 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs uppercase font-bold text-[#790026] tracking-wider bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                Métricas & Diagnóstico
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">{service.type}</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>{service.name}</span>
            </h2>
            <p className="text-xs font-mono text-slate-500 truncate max-w-xl">
              {service.url || service.host}
            </p>
          </div>

          <div className="flex items-center space-x-2 self-end md:self-center">
            {onTriggerProbe && (
              <button
                onClick={() => {
                  onTriggerProbe(service.id);
                  setTimeout(fetchHistory, 1200);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#16a34a] border border-emerald-200 rounded-xl text-xs font-semibold shadow-sm transition-all"
                title="Ejecutar chequeo ahora"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Probar Ahora</span>
              </button>
            )}

            <button
              onClick={fetchHistory}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* GOOGLE CLOUD-STYLE FILTER & TIMELINE TOOLBAR */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="px-5 md:px-7 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Preset Buttons (1H, 6H, 24H, 7D, 30D, Personalizado) */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { label: '1H', value: '1h' },
              { label: '6H', value: '6h' },
              { label: '24H', value: '24h' },
              { label: '7D', value: '7d' },
              { label: '30D', value: '30d' },
              { label: 'Personalizado', value: 'custom' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setPeriod(tab.value)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  period === tab.value
                    ? 'bg-white text-[#790026] shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker (shown when 'custom' is active or for direct tuning) */}
          {period === 'custom' && (
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Desde:</span>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
              />
              <span className="text-slate-500 font-medium">Hasta:</span>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
              />
              <button
                onClick={handleApplyCustomDates}
                className="px-2.5 py-1 bg-[#790026] text-white rounded-lg font-semibold hover:bg-[#9c1b3e]"
              >
                Filtrar
              </button>
            </div>
          )}

          {/* Status & View Filters */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#790026]"
              >
                <option value="ALL">Todos los Estados ({historyData?.summary?.total || 0})</option>
                <option value="UP">🟢 Solo Operativos (UP)</option>
                <option value="DEGRADED">🟡 Solo Degradados</option>
                <option value="DOWN">🔴 Solo Caídos / Timeout</option>
              </select>
            </div>

            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('chart')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'chart' ? 'bg-white text-[#790026] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Gráfico
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'logs' ? 'bg-white text-[#790026] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tabla de Registros
              </button>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MAIN BODY: METRICS & CHART */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="p-5 md:p-7 overflow-y-auto space-y-6 flex-1 bg-[#f8fafc]/50">
          {/* KPI Summary Cards (Google Cloud Metric Stats) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Avg Response Time */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Latencia Promedio</span>
              <div className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline space-x-1">
                <span>{historyData?.summary?.avgResponseTime ?? '--'}</span>
                <span className="text-xs text-slate-500 font-normal">ms</span>
              </div>
            </div>

            {/* P95 Percentile */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Percentil 95 (P95)</span>
              <div className="text-2xl font-bold text-[#790026] mt-1 flex items-baseline space-x-1">
                <span>{historyData?.summary?.p95ResponseTime ?? '--'}</span>
                <span className="text-xs text-slate-500 font-normal">ms</span>
              </div>
            </div>

            {/* Max / Min Latency */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Mínimo / Máximo</span>
              <div className="text-sm font-bold text-slate-800 mt-1 space-y-0.5 font-mono">
                <div>Min: <span className="text-[#16a34a]">{historyData?.summary?.minResponseTime ?? 0}ms</span></div>
                <div>Max: <span className="text-[#d97706]">{historyData?.summary?.maxResponseTime ?? 0}ms</span></div>
              </div>
            </div>

            {/* Uptime % */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Disponibilidad (Uptime)</span>
              <div className="text-2xl font-bold text-[#16a34a] mt-1 flex items-baseline space-x-1">
                <span>{historyData?.summary?.uptimePercent ?? 100}%</span>
                <span className="text-xs text-slate-400 font-normal">SLA</span>
              </div>
            </div>

            {/* Samples count */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Muestras Evaluadas</span>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                {historyData?.summary?.total ?? 0}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 1: INTERACTIVE CHART & INSPECTION PANEL */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'chart' && (
            <div className="space-y-4">
              {/* Chart Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">Línea de Tiempo de Tiempo de Respuesta (ms)</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-500">Pasa el cursor o haz clic en cualquier punto para inspeccionar detalles</span>
                  </div>
                  {service.slowThresholdMs && (
                    <div className="flex items-center space-x-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                      <span className="w-2 h-0.5 bg-amber-500" />
                      <span>Umbral Lento: {service.slowThresholdMs} ms</span>
                    </div>
                  )}
                </div>

                {validPoints.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                    No hay datos registrados en el intervalo seleccionado.
                  </div>
                ) : (
                  <div className="relative overflow-x-auto">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-56 select-none"
                    >
                      {/* Grid Lines & Axis */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const yVal = Math.round(minVal + ratio * (maxVal - minVal));
                        const yPos = chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom);
                        return (
                          <g key={ratio}>
                            <line
                              x1={padding.left}
                              y1={yPos}
                              x2={chartWidth - padding.right}
                              y2={yPos}
                              stroke="#f1f5f9"
                              strokeWidth="1"
                            />
                            <text
                              x={padding.left - 8}
                              y={yPos + 3}
                              fontSize="10"
                              fill="#94a3b8"
                              textAnchor="end"
                              fontFamily="monospace"
                            >
                              {yVal} ms
                            </text>
                          </g>
                        );
                      })}

                      {/* Slow Threshold Reference Line */}
                      {slowThresholdY && slowThresholdY >= padding.top && slowThresholdY <= chartHeight - padding.bottom && (
                        <line
                          x1={padding.left}
                          y1={slowThresholdY}
                          x2={chartWidth - padding.right}
                          y2={slowThresholdY}
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />
                      )}

                      {/* Area Fill */}
                      <defs>
                        <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#790026" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#790026" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>
                      <path d={areaPath} fill="url(#latencyGradient)" />

                      {/* Line Path */}
                      <path
                        d={`M ${linePoints.replace(/ /g, ' L ')}`}
                        fill="none"
                        stroke="#790026"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Hourly / Data Points */}
                      {validPoints.map((p: any, idx: number) => {
                        const cx = getX(p.date);
                        const cy = getY(p.value);
                        const isUp = p.status === 'UP';
                        const isDegraded = p.status === 'DEGRADED';
                        const isDown = p.status === 'DOWN' || p.status === 'TIMEOUT';
                        const isSelected = selectedPoint?.id === p.id;
                        const isHovered = hoveredPoint?.id === p.id;

                        let color = '#16a34a';
                        if (isDegraded) color = '#d97706';
                        if (isDown) color = '#BA1B1B';

                        return (
                          <g key={p.id || idx}>
                            {/* Outer halo when selected or hovered */}
                            {(isSelected || isHovered) && (
                              <circle
                                cx={cx}
                                cy={cy}
                                r="8"
                                fill={color}
                                fillOpacity="0.25"
                              />
                            )}

                            {/* Point Dot */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected || isHovered ? "5" : "3.5"}
                              fill={color}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              className="cursor-pointer transition-all hover:scale-125"
                              onMouseEnter={() => setHoveredPoint(p)}
                              onMouseLeave={() => setHoveredPoint(null)}
                              onClick={() => setSelectedPoint(p)}
                            />
                          </g>
                        );
                      })}

                      {/* X Axis Time Labels */}
                      {validPoints.length > 1 && (
                        <g fontSize="10" fill="#94a3b8" textAnchor="middle">
                          <text x={padding.left} y={chartHeight - 10} textAnchor="start">
                            {validPoints[0].date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} ({validPoints[0].date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })})
                          </text>
                          <text x={chartWidth - padding.right} y={chartHeight - 10} textAnchor="end">
                            {validPoints[validPoints.length - 1].date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} ({validPoints[validPoints.length - 1].date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })})
                          </text>
                        </g>
                      )}
                    </svg>

                    {/* Hover Floating Tooltip */}
                    {hoveredPoint && (
                      <div
                        className="absolute z-20 bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2"
                        style={{
                          left: `${(getX(new Date(hoveredPoint.timestamp)) / chartWidth) * 100}%`,
                          top: `${(getY(hoveredPoint.responseTime ?? 0) / chartHeight) * 100}%`,
                        }}
                      >
                        <div className="font-bold flex items-center space-x-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              hoveredPoint.status === 'UP'
                                ? 'bg-emerald-400'
                                : hoveredPoint.status === 'DEGRADED'
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            }`}
                          />
                          <span>{hoveredPoint.status}</span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-yellow-400">{hoveredPoint.responseTime ?? '--'} ms</span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1">
                          {new Date(hoveredPoint.timestamp).toLocaleTimeString('es-BO')} — {new Date(hoveredPoint.timestamp).toLocaleDateString('es-BO')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────── */}
              {/* SNAPSHOT INSPECTION PANEL (WHEN CLICKING A POINT) */}
              {/* ─────────────────────────────────────────────────────── */}
              {selectedPoint && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Info className="w-4 h-4 text-[#790026]" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        Detalle de Muestra Seleccionada (Snapshot)
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(selectedPoint.timestamp).toLocaleString('es-BO')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500">Estado</span>
                      <div className="font-bold text-sm mt-1 flex items-center space-x-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            selectedPoint.status === 'UP'
                              ? 'bg-[#16a34a]'
                              : selectedPoint.status === 'DEGRADED'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                        />
                        <span
                          className={
                            selectedPoint.status === 'UP'
                              ? 'text-[#16a34a]'
                              : selectedPoint.status === 'DEGRADED'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }
                        >
                          {selectedPoint.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500">Tiempo de Respuesta</span>
                      <div className="font-bold text-sm text-slate-900 mt-1 font-mono">
                        {selectedPoint.responseTime ?? selectedPoint.pingAvg ?? '--'} ms
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500">Código HTTP</span>
                      <div className="font-bold text-sm text-slate-900 mt-1 font-mono">
                        {selectedPoint.httpCode ? `HTTP ${selectedPoint.httpCode}` : 'N/A'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500">SSL / Ping Info</span>
                      <div className="font-bold text-sm text-slate-900 mt-1">
                        {selectedPoint.sslDaysLeft !== undefined && selectedPoint.sslDaysLeft !== null
                          ? `${selectedPoint.sslDaysLeft} días SSL`
                          : selectedPoint.pingLoss !== undefined
                          ? `${selectedPoint.pingLoss}% pérdida`
                          : 'Normal'}
                      </div>
                    </div>
                  </div>

                  {/* Error & Response Details */}
                  {selectedPoint.error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs space-y-1">
                      <span className="font-bold text-red-900">Mensaje de Error Registrado:</span>
                      <p className="font-mono text-red-700 whitespace-pre-wrap">{selectedPoint.error}</p>
                    </div>
                  )}

                  {selectedPoint.bodySnippet && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <span className="font-bold text-slate-700">Fragmento de Respuesta del Servidor:</span>
                      <pre className="font-mono text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 max-h-28 overflow-y-auto">
                        {selectedPoint.bodySnippet}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 2: LOGS TABLE */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'logs' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Latencia (ms)</th>
                      <th className="px-4 py-3">Código HTTP</th>
                      <th className="px-4 py-3">Detalle / Error</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredChecks.map((check: any) => {
                      const isUp = check.status === 'UP';
                      const isDegraded = check.status === 'DEGRADED';
                      const isDown = check.status === 'DOWN' || check.status === 'TIMEOUT';
                      const isSelected = selectedPoint?.id === check.id;

                      return (
                        <tr
                          key={check.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-rose-50/60 font-semibold' : ''
                          }`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap font-mono">
                            {new Date(check.timestamp).toLocaleString('es-BO')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                isUp
                                  ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200'
                                  : isDegraded
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isUp ? 'bg-[#16a34a]' : isDegraded ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                              />
                              <span>{check.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono font-bold">
                            {check.responseTime ?? check.pingAvg ?? '--'} ms
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-500">
                            {check.httpCode ? `HTTP ${check.httpCode}` : '--'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 truncate max-w-xs">
                            {check.error || (check.sslDaysLeft !== undefined ? `SSL: ${check.sslDaysLeft}d` : 'OK')}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedPoint(check);
                                setActiveTab('chart');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                            >
                              Ver en Gráfico
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* FOOTER */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Servicio General de Identificación Personal &bull; SEGIP Monitoring Suite</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceMetricsModal;
