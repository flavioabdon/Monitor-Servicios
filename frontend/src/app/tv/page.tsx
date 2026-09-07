'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Maximize2,
  Minimize2,
  Zap,
  ShieldCheck,
  Server,
  Globe,
  Database,
  Wifi,
  Radio,
  Lock,
  Flame,
  Calendar,
  Filter,
  RefreshCw,
  BarChart2,
  Check,
  X,
  ChevronDown,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import SegipLogo from '@/components/SegipLogo';
import TvServiceSparkline, { ServiceCheck } from '@/components/TvServiceSparkline';
import ServiceMetricsModal from '@/components/ServiceMetricsModal';
import { ServiceAPI } from '@/lib/api';

interface ServiceItem {
  id: string;
  name: string;
  type: string;
  url: string;
  host?: string;
  group?: { id: string; name: string; color: string };
  checks: ServiceCheck[];
  alerts: any[];
}

interface TvData {
  summary: {
    total: number;
    up: number;
    degraded: number;
    down: number;
    avgResponseTime: number;
    uptimePercent: number;
    activeAlertCount: number;
  };
  period?: string;
  fromDate?: string;
  toDate?: string;
  services: ServiceItem[];
  activeAlerts: any[];
  updatedAt: string;
}

const TIME_PERIODS = [
  { key: '15m', label: '15 min' },
  { key: '1h', label: '1 hora' },
  { key: '6h', label: '6 horas' },
  { key: '12h', label: '12 horas' },
  { key: '24h', label: '24 horas' },
  { key: '7d', label: '7 días' },
];

export default function TvModePage() {
  const [data, setData] = useState<TvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<string>('1h');
  const [showCustomDatePanel, setShowCustomDatePanel] = useState<boolean>(false);
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [activeRangeLabel, setActiveRangeLabel] = useState<string>('');

  // State for Service Detail / Metrics modal on card click
  const [metricsService, setMetricsService] = useState<any>(null);

  const [currentTime, setCurrentTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTriggerProbe = async (id: string) => {
    try {
      await ServiceAPI.triggerProbe(id);
      fetchTvData();
    } catch (err) {
      console.error('Error triggering probe:', err);
    }
  };

  // Initialize custom dates with default 24h range
  const toIsoLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    const now = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    setCustomTo(toIsoLocal(now));
    setCustomFrom(toIsoLocal(yesterday));
  }, []);

  const fetchTvData = async (periodToUse?: string, fromOverride?: string, toOverride?: string) => {
    try {
      const activePeriod = periodToUse || timePeriod;
      setIsRefreshing(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

      const params: any = {
        period: activePeriod,
        limit: activePeriod === '15m' ? 20 : activePeriod === '1h' ? 30 : activePeriod === 'custom' ? 80 : 50,
      };

      if (activePeriod === 'custom') {
        const fromVal = fromOverride || customFrom;
        const toVal = toOverride || customTo;
        if (fromVal) params.from = new Date(fromVal).toISOString();
        if (toVal) params.to = new Date(toVal).toISOString();
      }

      const res = await axios.get(`${backendUrl}/api/stats/tv`, { params });
      setData(res.data);
      setCountdown(15);
    } catch (err) {
      console.error('TV fetch error:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    if (newPeriod === 'custom') {
      setShowCustomDatePanel(true);
      return;
    }
    setShowCustomDatePanel(false);
    setTimePeriod(newPeriod);
    setActiveRangeLabel('');
    fetchTvData(newPeriod);
  };

  const handleApplyCustomDates = () => {
    if (!customFrom || !customTo) {
      alert('Por favor seleccione fecha desde y hasta');
      return;
    }
    setTimePeriod('custom');
    setShowCustomDatePanel(false);

    try {
      const f = new Date(customFrom);
      const t = new Date(customTo);
      const formatShort = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      setActiveRangeLabel(`${formatShort(f)} → ${formatShort(t)}`);
    } catch {
      setActiveRangeLabel('Rango Personalizado');
    }

    fetchTvData('custom', customFrom, customTo);
  };

  const handleQuickPreset = (preset: 'today' | 'yesterday' | '3days' | 'week' | 'month') => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (preset === 'today') {
      from.setHours(0, 0, 0, 0);
    } else if (preset === 'yesterday') {
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(now.getDate() - 1);
      to.setHours(23, 59, 59, 999);
    } else if (preset === '3days') {
      from.setDate(now.getDate() - 3);
    } else if (preset === 'week') {
      from.setDate(now.getDate() - 7);
    } else if (preset === 'month') {
      from.setMonth(now.getMonth() - 1);
    }

    const fromStr = toIsoLocal(from);
    const toStr = toIsoLocal(to);
    setCustomFrom(fromStr);
    setCustomTo(toStr);
  };

  useEffect(() => {
    fetchTvData();

    // Digital clock interval
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    }, 1000);

    // Auto-refresh countdown
    const refreshTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchTvData();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    // Socket.io for live updates
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const socket = io(backendUrl);

    socket.on('check:result', () => {
      fetchTvData();
    });

    socket.on('alert:update', () => {
      fetchTvData();
    });

    return () => {
      clearInterval(clockInterval);
      clearInterval(refreshTimer);
      socket.disconnect();
    };
  }, [timePeriod]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'WEB_INSTITUCIONAL':
      case 'SISTEMA_WEB':
        return <Globe className="w-4 h-4 text-blue-600" />;
      case 'API_JSON':
        return <Database className="w-4 h-4 text-emerald-600" />;
      case 'SOAP_WSDL':
      case 'SOAP_OPERACION':
        return <Server className="w-4 h-4 text-amber-600" />;
      case 'LOGIN_CHECK':
        return <Lock className="w-4 h-4 text-[#245b87]" />;
      case 'PING':
        return <Wifi className="w-4 h-4 text-teal-600" />;
      case 'SSL_CERT':
        return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center text-slate-800 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#245b87] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-widest text-[#245b87]">INICIALIZANDO MONITOREO SALA NOC...</p>
        </div>
      </div>
    );
  }

  // Group services by group or default category
  const groupsMap = new Map<string, { name: string; color: string; services: ServiceItem[] }>();
  data?.services.forEach((s) => {
    const groupName = s.group?.name || 'Servicios Institucionales';
    const groupColor = s.group?.color || '#245b87';
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, { name: groupName, color: groupColor, services: [] });
    }
    groupsMap.get(groupName)!.services.push(s);
  });

  const groupList = Array.from(groupsMap.values());

  return (
    <div ref={containerRef} className="min-h-screen bg-[#f1f5f9] text-slate-800 p-3 md:p-5 flex flex-col justify-between select-none font-sans relative">
      {/* Top Floating Backdrop Accent */}
      {/*       <div className="w-full flex justify-center pt-2 px-4 absolute top-0 left-0 right-0 pointer-events-none z-0">
        <div className="w-[96vw] max-w-7xl h-36 rounded-3xl bg-[#b0697f]/15 border border-[#b0697f]/25 blur-[1px]" />
      </div> */}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP BAR / OPERATIONS HEADER & GLOBAL TIME FILTER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="relative flex flex-col lg:flex-row items-stretch lg:items-center justify-between border border-slate-200/90 pb-3 mb-4 z-20 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm gap-3">
        {/* Left Side: Logo & Status indicator */}
        <div className="flex items-center justify-between lg:justify-start space-x-3 sm:space-x-4">
          <SegipLogo size="md" />

          <div className="hidden 2xl:block border-l border-slate-200 pl-3 py-0.5">
            <span className="text-[10px] font-semibold text-slate-600 tracking-tight block">
              Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas - SEGIP
            </span>
          </div>

          {/*           <div className="flex items-center space-x-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-600 font-semibold shadow-inner">
            <Radio className="w-3.5 h-3.5 text-[#16a34a] animate-pulse" />
            <span className="hidden sm:inline">SALA DE OPERACIONES NOC</span>
            <span className="sm:hidden">NOC LIVE</span>
          </div> */}
        </div>

        {/* Center: Global Time Filter Bar with Custom Date Option */}
        <div className="flex items-center justify-center bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 shadow-inner overflow-x-auto">
          <div className="flex items-center space-x-1 text-slate-500 mr-2 px-1 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-[#245b87]" />
            <span className="hidden md:inline text-[11px]">Rango Global:</span>
          </div>
          <div className="flex items-center space-x-1">
            {TIME_PERIODS.map((tp) => {
              const isActive = timePeriod === tp.key;
              return (
                <button
                  key={tp.key}
                  type="button"
                  onClick={() => handlePeriodChange(tp.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${isActive
                    ? 'bg-[#245b87] text-white shadow-sm ring-1 ring-[#245b87]/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                >
                  {tp.label}
                </button>
              );
            })}

            {/* Custom Date Filter Button */}
            <button
              type="button"
              onClick={() => setShowCustomDatePanel(!showCustomDatePanel)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${timePeriod === 'custom'
                ? 'bg-[#245b87] text-white shadow-sm ring-1 ring-[#245b87]/30'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/80 border border-slate-200/80 bg-white/50'
                }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{activeRangeLabel ? activeRangeLabel : 'Personalizado'}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
          </div>
        </div>

        {/* Right Side: Live Clock, Countdown, Refresh & Fullscreen */}
        <div className="flex items-center justify-end space-x-2 md:space-x-3">
          {/* Manual Refresh button */}
          <button
            onClick={() => fetchTvData()}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all shadow-sm flex items-center"
            title="Refrescar ahora"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin text-[#245b87]' : ''}`} />
          </button>

          {/* Refresh countdown ring */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] text-slate-500">Auto:</span>
            <span className="text-slate-900 font-bold font-mono text-xs">{countdown}s</span>
          </div>

          {/* Digital Clock */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-[#245b87] font-bold text-base md:text-lg shadow-inner font-mono">
            <span>{currentTime || '00:00:00'}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all shadow-sm"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* ── POPUP / PANEL: CUSTOM DATE RANGE SELECTOR ── */}
        {showCustomDatePanel && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[95%] max-w-xl bg-white border-2 border-[#245b87]/30 rounded-2xl shadow-2xl p-4 z-50 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <Calendar className="w-4 h-4 text-[#245b87]" />
                <span>Filtrar Todos los Cards por Rango Personalizado</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomDatePanel(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { label: 'Hoy', id: 'today' as const },
                { label: 'Ayer', id: 'yesterday' as const },
                { label: 'Últimos 3 días', id: '3days' as const },
                { label: 'Últimos 7 días', id: 'week' as const },
                { label: 'Último Mes', id: 'month' as const },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickPreset(p.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* DateTime Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Desde (Fecha y Hora)</label>
                <input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hasta (Fecha y Hora)</label>
                <input
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomDatePanel(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDates}
                className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#245b87] hover:bg-[#1b496d] rounded-xl shadow-md shadow-[#245b87]/20 transition-all active:scale-[0.99]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar Rango a Toda la TV</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ACTIVE INCIDENT BANNER (IF ANY DOWN / DEGRADED) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {data?.activeAlerts && data.activeAlerts.length > 0 && (
        <div className="mb-4 p-3.5 bg-red-50 border-2 border-red-300 rounded-2xl flex items-center justify-between text-red-800 shadow-md shadow-red-100 z-10">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-[#BA1B1B] text-white flex-shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="text-xs truncate">
              <span className="font-bold text-red-950 tracking-wide uppercase mr-2">[INCIDENTE ACTIVO]:</span>
              {data.activeAlerts.map((a, idx) => (
                <span key={a.id || idx} className="mr-3 bg-red-100 px-2.5 py-1 rounded-lg border border-red-300 text-xs font-semibold text-red-900">
                  [ALERTA] {a.service?.name || 'Servicio'}: {a.type}
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs text-red-700 font-bold flex-shrink-0 ml-2">
            TOTAL: {data.activeAlerts.length} ALERTA(S)
          </span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* KPI METRIC CARDS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 z-10">
        {/* Total Services */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#245b87]" />
          <span className="text-xs text-slate-500 font-semibold">Total Servicios</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-900">{data?.summary.total || 0}</span>
            <Server className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* UP Services */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#16a34a]" />
          <span className="text-xs text-[#16a34a] font-semibold flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Operativos
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-[#16a34a]">{data?.summary.up || 0}</span>
            <div className="w-3 h-3 rounded-full bg-[#16a34a] live-indicator-up" />
          </div>
        </div>

        {/* Degraded Services */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#d97706]" />
          <span className="text-xs text-amber-600 font-semibold flex items-center">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Degradados
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-amber-600">{data?.summary.degraded || 0}</span>
            <span className="text-xs text-amber-600 font-sans font-medium">Auth/Latency</span>
          </div>
        </div>

        {/* Down Services */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#BA1B1B]" />
          <span className="text-xs text-red-600 font-semibold flex items-center">
            <XCircle className="w-3.5 h-3.5 mr-1" /> Caídos
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-red-600">{data?.summary.down || 0}</span>
            {data?.summary.down ? <div className="w-3 h-3 rounded-full bg-[#BA1B1B] live-indicator-down" /> : null}
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500" />
          <span className="text-xs text-slate-500 font-semibold flex items-center">
            <Zap className="w-3.5 h-3.5 mr-1 text-yellow-500" /> Latencia Prom.
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-800">{data?.summary.avgResponseTime || 0}</span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
        </div>

        {/* Global Uptime */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#B73852]" />
          <span className="text-xs text-slate-500 font-semibold">Uptime Global</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-[#245b87]">{data?.summary.uptimePercent || 100}%</span>
            <span className="text-xs text-[#16a34a] font-semibold">SLA OK</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN SERVICE GRID GROUPED BY CATEGORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1 z-10">
        {groupList.map((group) => (
          <div key={group.name} className="space-y-2">
            {/* Category Header */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
              <h2 className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                {group.name} ({group.services.length})
              </h2>
            </div>

            {/* Service Cards Grid — Ultra-compact high density */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5">
              {group.services.map((svc) => {
                const lastCheck = svc.checks[0];
                const status = lastCheck?.status || 'UNKNOWN';
                const isUp = status === 'UP';
                const isDegraded = status === 'DEGRADED';
                const isDown = status === 'DOWN' || status === 'TIMEOUT';

                let cardBorder = 'border-slate-200 hover:border-[#245b87]/70';
                let statusBadge = 'bg-emerald-50 text-[#16a34a] border-emerald-200';
                let statusText = 'UP';

                if (isDegraded) {
                  cardBorder = 'border-amber-300 shadow-sm hover:border-amber-500';
                  statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                  statusText = 'DEG';
                } else if (isDown) {
                  cardBorder = 'border-red-300 shadow-sm hover:border-red-500';
                  statusBadge = 'bg-red-50 text-red-700 border-red-200';
                  statusText = 'DOWN';
                }

                return (
                  <div
                    key={svc.id}
                    onClick={() => setMetricsService(svc)}
                    className={`rounded-2xl p-2.5 bg-white border ${cardBorder} transition-all duration-150 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex flex-col justify-between group select-none relative overflow-hidden`}
                    title="Haz clic para ver métricas y gráficos detallados"
                  >
                    {/* Top status accent line */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-0.5 ${isUp ? 'bg-[#16a34a]' : isDegraded ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                    />

                    <div>
                      {/* Top row: Icon + Service Name + Status Badge & Latency */}
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                          <div className="p-1 rounded-lg bg-slate-50 border border-slate-200/80 flex-shrink-0">
                            {getServiceIcon(svc.type)}
                          </div>
                          <h3
                            className="font-bold text-xs text-slate-900 truncate tracking-tight group-hover:text-[#245b87] transition-colors"
                            title={svc.name}
                          >
                            {svc.name}
                          </h3>
                        </div>

                        {/* Status + Latency Badge */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border flex items-center space-x-1 ${statusBadge}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-[#16a34a]' : isDegraded ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                            />
                            <span>{statusText}</span>
                          </span>
                        </div>
                      </div>

                      {/* URL / Endpoint Host */}
                      <p className="text-[10px] font-mono text-slate-400 truncate mb-1" title={svc.url}>
                        {svc.host || svc.url.replace(/^https?:\/\//, '')}
                      </p>

                      {/* Compact Sparkline with Interactive Points */}
                      <div className="my-1">
                        <TvServiceSparkline checks={svc.checks} height={36} />
                      </div>
                    </div>

                    {/* Compact Footer Submetrics */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-600">
                      {/* Latency */}
                      <div className="flex items-center space-x-0.5 font-bold text-slate-800">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        <span>{lastCheck?.responseTime ?? lastCheck?.pingAvg ?? '--'}</span>
                        <span className="text-[9px] text-slate-400 font-normal">ms</span>
                      </div>

                      {/* Chips row */}
                      <div className="flex items-center space-x-1 overflow-hidden">
                        {lastCheck?.httpCode && (
                          <span className="px-1 py-0.2 text-[9px] font-semibold bg-slate-100 border border-slate-200 rounded text-slate-600">
                            {lastCheck.httpCode}
                          </span>
                        )}

                        {lastCheck?.sslDaysLeft !== undefined && lastCheck?.sslDaysLeft !== null && (
                          <span
                            className={`px-1 py-0.2 text-[9px] font-semibold rounded ${lastCheck.sslDaysLeft < 15
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-rose-50 text-[#245b87] border border-rose-200'
                              }`}
                          >
                            SSL:{lastCheck.sslDaysLeft}d
                          </span>
                        )}

                        {lastCheck?.pingLoss !== undefined && lastCheck?.pingLoss !== null && lastCheck.pingLoss > 0 && (
                          <span className="px-1 py-0.2 text-[9px] font-semibold text-amber-700 bg-amber-50 rounded">
                            {lastCheck.pingLoss}%
                          </span>
                        )}

                        {/* Hint Icon on Hover */}
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-[#245b87] transition-colors ml-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FOOTER BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <footer className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 z-10">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
            <span>Operativo</span>
          </span>
          <span className="flex items-center space-x-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Degradado / Alerta Lógica</span>
          </span>
          <span className="flex items-center space-x-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#BA1B1B]" />
            <span>Caído / Timeout</span>
          </span>
        </div>

        <div className="text-[11px] text-right">
          <p className="font-semibold text-slate-700">
            Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas - SEGIP
          </p>
          <p className="text-[10px] text-slate-400">
            Servicio General de Identificación Personal &bull; SEGIP &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: SERVICE METRICS & ANALYTICS (INSPECTION ON CARD CLICK) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {metricsService && (
        <ServiceMetricsModal
          service={metricsService}
          isOpen={!!metricsService}
          onClose={() => setMetricsService(null)}
          onTriggerProbe={handleTriggerProbe}
        />
      )}
    </div>
  );
}
