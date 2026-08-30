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
  Flame
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import SegipLogo from '@/components/SegipLogo';

interface ServiceCheck {
  status: 'UP' | 'DEGRADED' | 'DOWN' | 'TIMEOUT';
  responseTime: number;
  httpCode?: number;
  pingAvg?: number;
  pingLoss?: number;
  sslDaysLeft?: number;
  timestamp: string;
}

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
  services: ServiceItem[];
  activeAlerts: any[];
  updatedAt: string;
}

export default function TvModePage() {
  const [data, setData] = useState<TvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchTvData = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const res = await axios.get(`${backendUrl}/api/stats/tv`);
      setData(res.data);
      setCountdown(15);
    } catch (err) {
      console.error('TV fetch error:', err);
    } finally {
      setLoading(false);
    }
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
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
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
        return <Lock className="w-4 h-4 text-[#790026]" />;
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
          <div className="w-12 h-12 border-4 border-[#790026] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-widest text-[#790026]">INICIALIZANDO MONITOREO SALA NOC...</p>
        </div>
      </div>
    );
  }

  // Group services by group or default category
  const groupsMap = new Map<string, { name: string; color: string; services: ServiceItem[] }>();
  data?.services.forEach((s) => {
    const groupName = s.group?.name || 'Servicios Institucionales';
    const groupColor = s.group?.color || '#790026';
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, { name: groupName, color: groupColor, services: [] });
    }
    groupsMap.get(groupName)!.services.push(s);
  });

  const groupList = Array.from(groupsMap.values());

  return (
    <div ref={containerRef} className="min-h-screen bg-[#f1f5f9] text-slate-800 p-4 md:p-6 flex flex-col justify-between select-none font-sans relative">
      {/* Top Floating Backdrop Accent */}
      <div className="w-full flex justify-center pt-2 px-4 absolute top-0 left-0 right-0 pointer-events-none z-0">
        <div className="w-[96vw] max-w-7xl h-36 rounded-3xl bg-[#b0697f]/15 border border-[#b0697f]/25 blur-[1px]" />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP BAR / OPERATIONS HEADER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4 z-10 bg-white/90 backdrop-blur px-5 py-3 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-4">
          <SegipLogo size="md" />

          <div className="hidden lg:flex items-center space-x-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-600 font-semibold">
            <Radio className="w-3.5 h-3.5 text-[#16a34a] animate-pulse" />
            <span>SALA DE OPERACIONES NOC</span>
          </div>
        </div>

        {/* Global Live Ticker Indicators */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Digital Clock */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-[#790026] font-bold text-lg md:text-xl shadow-inner font-mono">
            <Clock className="w-5 h-5 text-[#790026]" />
            <span>{currentTime || '00:00:00'}</span>
          </div>

          {/* Refresh countdown ring */}
          <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <span>Refresco:</span>
            <span className="text-slate-900 font-bold font-mono">{countdown}s</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all shadow-sm"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
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
                  ⚠️ {a.service?.name || 'Servicio'}: {a.type}
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
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#790026]" />
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
            <span className="text-3xl font-extrabold text-[#790026]">{data?.summary.uptimePercent || 100}%</span>
            <span className="text-xs text-[#16a34a] font-semibold">SLA OK</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN SERVICE GRID GROUPED BY CATEGORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-1 z-10">
        {groupList.map((group) => (
          <div key={group.name} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-600">
                {group.name} ({group.services.length})
              </h2>
            </div>

            {/* Service Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {group.services.map((svc) => {
                const lastCheck = svc.checks[0];
                const status = lastCheck?.status || 'UNKNOWN';
                const isUp = status === 'UP';
                const isDegraded = status === 'DEGRADED';
                const isDown = status === 'DOWN' || status === 'TIMEOUT';

                let cardBg = 'bg-white border-slate-200';
                let statusBadge = 'bg-emerald-50 text-[#16a34a] border-emerald-200';
                let statusText = 'UP';

                if (isDegraded) {
                  cardBg = 'bg-white border-amber-300 shadow-sm';
                  statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                  statusText = 'DEGRADED';
                } else if (isDown) {
                  cardBg = 'bg-white border-red-300 shadow-sm';
                  statusBadge = 'bg-red-50 text-red-700 border-red-200';
                  statusText = 'DOWN';
                }

                return (
                  <div
                    key={svc.id}
                    className={`rounded-2xl p-4 border transition-all shadow-sm relative flex flex-col justify-between ${cardBg}`}
                  >
                    <div>
                      {/* Top row: Type Icon + Status Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                          {getServiceIcon(svc.type)}
                        </div>

                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border flex items-center space-x-1.5 ${statusBadge}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isUp ? 'bg-[#16a34a]' : isDegraded ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                          />
                          <span>{statusText}</span>
                        </span>
                      </div>

                      {/* Service Name */}
                      <h3 className="font-bold text-sm text-slate-900 truncate tracking-tight" title={svc.name}>
                        {svc.name}
                      </h3>

                      {/* URL or Host */}
                      <p className="text-xs font-mono text-slate-500 truncate mt-0.5" title={svc.url}>
                        {svc.host || svc.url.replace(/^https?:\/\//, '')}
                      </p>
                    </div>

                    {/* Metrics Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      {/* Latency / Ping */}
                      <div className="flex items-center space-x-1 text-slate-800 font-mono">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="font-bold">{lastCheck?.responseTime ?? lastCheck?.pingAvg ?? '--'}</span>
                        <span className="text-slate-400 text-[10px]">ms</span>
                      </div>

                      {/* HTTP Code or SSL Info */}
                      {lastCheck?.httpCode && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          HTTP {lastCheck.httpCode}
                        </span>
                      )}

                      {lastCheck?.sslDaysLeft !== undefined && lastCheck?.sslDaysLeft !== null && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            lastCheck.sslDaysLeft < 15
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-rose-50 text-[#790026] border border-rose-200'
                          }`}
                        >
                          SSL: {lastCheck.sslDaysLeft}d
                        </span>
                      )}

                      {lastCheck?.pingLoss !== undefined && lastCheck?.pingLoss !== null && lastCheck.pingLoss > 0 && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          Loss: {lastCheck.pingLoss}%
                        </span>
                      )}
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
      <footer className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 z-10">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
            <span>200 OK</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Degradado / Auth Error</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#BA1B1B]" />
            <span>Caído / Timeout</span>
          </span>
        </div>

        <div>
          Servicio General de Identificación Personal &bull; SEGIP &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
