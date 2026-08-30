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
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'API_JSON':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'SOAP_WSDL':
      case 'SOAP_OPERACION':
        return <Server className="w-4 h-4 text-amber-400" />;
      case 'LOGIN_CHECK':
        return <Lock className="w-4 h-4 text-purple-400" />;
      case 'PING':
        return <Wifi className="w-4 h-4 text-cyan-400" />;
      case 'SSL_CERT':
        return <ShieldCheck className="w-4 h-4 text-indigo-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#060a12] flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl font-mono tracking-widest text-indigo-400">INICIALIZANDO MODO TV SEGIP...</p>
        </div>
      </div>
    );
  }

  // Group services by group or default category
  const groupsMap = new Map<string, { name: string; color: string; services: ServiceItem[] }>();
  data?.services.forEach((s) => {
    const groupName = s.group?.name || 'Servicios Generales';
    const groupColor = s.group?.color || '#6366f1';
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, { name: groupName, color: groupColor, services: [] });
    }
    groupsMap.get(groupName)!.services.push(s);
  });

  const groupList = Array.from(groupsMap.values());

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050811] text-gray-100 p-4 md:p-6 flex flex-col justify-between select-none">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP BAR / OPERATIONS HEADER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 bg-gray-900/90 border border-gray-800 px-4 py-2 rounded-2xl shadow-inner">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 live-indicator-up" />
            <span className="font-mono font-extrabold text-xl md:text-2xl tracking-wider text-white">
              SEGIP <span className="text-indigo-400 font-normal">NOC MONITOR</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono bg-gray-900/60 border border-gray-800 px-3 py-1.5 rounded-xl text-gray-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>SALA DE OPERACIONES TI</span>
          </div>
        </div>

        {/* Global Live Ticker Indicators */}
        <div className="flex items-center space-x-3 md:space-x-6 font-mono">
          {/* Digital Clock */}
          <div className="flex items-center space-x-2 bg-gray-900/90 border border-gray-800 px-4 py-2 rounded-xl text-indigo-300 font-bold text-lg md:text-xl shadow-inner">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span>{currentTime || '00:00:00'}</span>
          </div>

          {/* Refresh countdown ring */}
          <div className="flex items-center space-x-2 text-xs text-gray-400 bg-gray-900/50 border border-gray-800/80 px-3 py-1.5 rounded-xl">
            <span>Refresh:</span>
            <span className="text-white font-bold text-sm w-5 text-center">{countdown}s</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-all shadow-md"
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
        <div className="mb-4 p-3.5 bg-red-950/80 border-2 border-red-500/80 rounded-2xl flex items-center justify-between text-red-200 animate-pulse shadow-lg shadow-red-950/50">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-red-600 text-white flex-shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="font-mono text-sm truncate">
              <span className="font-bold text-white tracking-wide uppercase mr-2">[INCIDENTE ACTIVO]:</span>
              {data.activeAlerts.map((a, idx) => (
                <span key={a.id || idx} className="mr-4 bg-red-900/90 px-2.5 py-1 rounded-lg border border-red-700 text-xs font-semibold">
                  ⚠️ {a.service?.name || 'Servicio'}: {a.type}
                </span>
              ))}
            </div>
          </div>
          <span className="font-mono text-xs text-red-300 font-bold flex-shrink-0 ml-2">
            TOTAL: {data.activeAlerts.length} ALERTA(S)
          </span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* KPI METRIC CARDS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 font-mono">
        {/* Total Services */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Servicios</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-white">{data?.summary.total || 0}</span>
            <Server className="w-5 h-5 text-gray-500" />
          </div>
        </div>

        {/* UP Services */}
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-3.5 flex flex-col justify-between shadow-md shadow-emerald-950/20">
          <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Operativos
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-emerald-400">{data?.summary.up || 0}</span>
            <div className="w-3 h-3 rounded-full bg-emerald-500 live-indicator-up" />
          </div>
        </div>

        {/* Degraded Services */}
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
          <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold flex items-center">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Degradados
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-amber-400">{data?.summary.degraded || 0}</span>
            <span className="text-xs text-amber-500 font-sans">Auth/Latency</span>
          </div>
        </div>

        {/* Down Services */}
        <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
          <span className="text-xs text-red-400 uppercase tracking-wider font-semibold flex items-center">
            <XCircle className="w-3.5 h-3.5 mr-1" /> Caídos
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-red-400">{data?.summary.down || 0}</span>
            {data?.summary.down ? <div className="w-3 h-3 rounded-full bg-red-500 live-indicator-down" /> : null}
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center">
            <Zap className="w-3.5 h-3.5 mr-1 text-yellow-400" /> Latencia Prom.
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-yellow-400">{data?.summary.avgResponseTime || 0}</span>
            <span className="text-xs text-gray-400">ms</span>
          </div>
        </div>

        {/* Global Uptime */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Uptime Global</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-indigo-400">{data?.summary.uptimePercent || 100}%</span>
            <span className="text-xs text-emerald-400 font-sans">SLA OK</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN SERVICE GRID GROUPED BY CATEGORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {groupList.map((group) => (
          <div key={group.name} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center space-x-2 border-b border-gray-800/80 pb-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
              <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-gray-300">
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

                let cardBg = 'bg-gray-900/70 border-gray-800/80';
                let statusBadge = 'bg-emerald-950 text-emerald-300 border-emerald-700/60';
                let statusText = 'UP';

                if (isDegraded) {
                  cardBg = 'bg-amber-950/30 border-amber-700/60';
                  statusBadge = 'bg-amber-950 text-amber-300 border-amber-600';
                  statusText = 'DEGRADED';
                } else if (isDown) {
                  cardBg = 'bg-red-950/40 border-red-600/80';
                  statusBadge = 'bg-red-950 text-red-300 border-red-500';
                  statusText = 'DOWN';
                }

                return (
                  <div
                    key={svc.id}
                    className={`rounded-2xl p-4 border transition-all shadow-md relative flex flex-col justify-between ${cardBg}`}
                  >
                    <div>
                      {/* Top row: Type Icon + Status Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-1.5 rounded-xl bg-gray-800/80 border border-gray-700">
                          {getServiceIcon(svc.type)}
                        </div>

                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border flex items-center space-x-1.5 ${statusBadge}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isUp ? 'bg-emerald-400' : isDegraded ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                          />
                          <span>{statusText}</span>
                        </span>
                      </div>

                      {/* Service Name */}
                      <h3 className="font-bold text-sm text-white truncate tracking-tight" title={svc.name}>
                        {svc.name}
                      </h3>

                      {/* URL or Host */}
                      <p className="text-xs font-mono text-gray-400 truncate mt-0.5" title={svc.url}>
                        {svc.host || svc.url.replace(/^https?:\/\//, '')}
                      </p>
                    </div>

                    {/* Metrics Footer */}
                    <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between font-mono text-xs">
                      {/* Latency / Ping */}
                      <div className="flex items-center space-x-1 text-gray-300">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="font-bold">{lastCheck?.responseTime ?? lastCheck?.pingAvg ?? '--'}</span>
                        <span className="text-gray-500 text-[10px]">ms</span>
                      </div>

                      {/* HTTP Code or SSL Info */}
                      {lastCheck?.httpCode && (
                        <span className="text-[11px] font-semibold text-gray-400 bg-gray-800/60 px-1.5 py-0.5 rounded">
                          HTTP {lastCheck.httpCode}
                        </span>
                      )}

                      {lastCheck?.sslDaysLeft !== undefined && lastCheck?.sslDaysLeft !== null && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            lastCheck.sslDaysLeft < 15
                              ? 'bg-red-950 text-red-400 border border-red-700'
                              : 'bg-indigo-950 text-indigo-300'
                          }`}
                        >
                          SSL: {lastCheck.sslDaysLeft}d
                        </span>
                      )}

                      {lastCheck?.pingLoss !== undefined && lastCheck?.pingLoss !== null && lastCheck.pingLoss > 0 && (
                        <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded">
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
      <footer className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-500 font-mono">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>200 OK</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Degradado / Auth Error</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Caído / Timeout</span>
          </span>
        </div>

        <div>
          SEGIP MONITOR v1.0 &bull; Servicio General de Identificación Personal
        </div>
      </footer>
    </div>
  );
}
