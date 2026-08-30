'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Plus,
  Server,
  Globe,
  Database,
  Wifi,
  ShieldCheck,
  Lock,
  Play,
  Trash2,
  Edit,
  Power,
  RefreshCw,
  Search,
  Filter,
  Monitor,
  LogOut,
  Bot,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Shield,
  FileText
} from 'lucide-react';
import { ServiceAPI, StatsAPI, GroupAPI, AlertAPI } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<string>('admin');
  const [loading, setLoading] = useState<boolean>(true);
  const [services, setServices] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [probingIds, setProbingIds] = useState<Record<string, boolean>>({});

  // Service Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'WEB_INSTITUCIONAL',
    url: '',
    host: '',
    groupId: '',
    method: 'GET',
    headers: '',
    body: '',
    expectedHttpCode: 200,
    expectedKeyword: '',
    unexpectedKeyword: '',
    loginSuccessField: 'token',
    loginSuccessValue: '',
    loginFailureKeyword: 'credenciales invalidas',
    soapAction: '',
    soapEnvelope: '',
    timeout: 10000,
    interval: 60,
    slaTarget: 99.5,
    slowThresholdMs: 3000,
    failureThreshold: 3,
    sslAlertDaysBefore: 30,
    notifyTelegram: true,
    notifyEmail: true,
    notifyEmailTo: '',
    enabled: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [svcData, grpData, stData] = await Promise.all([
        ServiceAPI.list(),
        GroupAPI.list(),
        StatsAPI.getDashboard(),
      ]);
      setServices(svcData);
      setGroups(grpData);
      setStats(stData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('segip_token');
    const storedUser = localStorage.getItem('segip_user');
    if (!token) {
      router.push('/login');
      return;
    }
    if (storedUser) setUser(storedUser);
    fetchData();

    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('segip_token');
    localStorage.removeItem('segip_user');
    router.push('/login');
  };

  const handleTriggerProbe = async (id: string) => {
    try {
      setProbingIds((prev) => ({ ...prev, [id]: true }));
      await ServiceAPI.triggerProbe(id);
      setTimeout(fetchData, 1200);
    } catch (err) {
      console.error('Error triggering probe:', err);
    } finally {
      setTimeout(() => {
        setProbingIds((prev) => ({ ...prev, [id]: false }));
      }, 1500);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await ServiceAPI.toggle(id);
      fetchData();
    } catch (err) {
      console.error('Error toggling service:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este servicio?')) {
      try {
        await ServiceAPI.delete(id);
        fetchData();
      } catch (err) {
        console.error('Error deleting service:', err);
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      type: 'WEB_INSTITUCIONAL',
      url: '',
      host: '',
      groupId: groups[0]?.id || '',
      method: 'GET',
      headers: '',
      body: '',
      expectedHttpCode: 200,
      expectedKeyword: '',
      unexpectedKeyword: '',
      loginSuccessField: 'token',
      loginSuccessValue: '',
      loginFailureKeyword: 'credenciales invalidas',
      soapAction: '',
      soapEnvelope: '',
      timeout: 10000,
      interval: 60,
      slaTarget: 99.5,
      slowThresholdMs: 3000,
      failureThreshold: 3,
      sslAlertDaysBefore: 30,
      notifyTelegram: true,
      notifyEmail: true,
      notifyEmailTo: '',
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (svc: any) => {
    setEditingService(svc);
    setFormData({
      name: svc.name,
      description: svc.description || '',
      type: svc.type,
      url: svc.url,
      host: svc.host || '',
      groupId: svc.groupId || '',
      method: svc.method || 'GET',
      headers: svc.headers ? JSON.stringify(svc.headers, null, 2) : '',
      body: svc.body || '',
      expectedHttpCode: svc.expectedHttpCode || 200,
      expectedKeyword: svc.expectedKeyword || '',
      unexpectedKeyword: svc.unexpectedKeyword || '',
      loginSuccessField: svc.loginSuccessField || 'token',
      loginSuccessValue: svc.loginSuccessValue || '',
      loginFailureKeyword: svc.loginFailureKeyword || '',
      soapAction: svc.soapAction || '',
      soapEnvelope: svc.soapEnvelope || '',
      timeout: svc.timeout || 10000,
      interval: svc.interval || 60,
      slaTarget: svc.slaTarget || 99.5,
      slowThresholdMs: svc.slowThresholdMs || 3000,
      failureThreshold: svc.failureThreshold || 3,
      sslAlertDaysBefore: svc.sslAlertDaysBefore || 30,
      notifyTelegram: svc.notifyTelegram ?? true,
      notifyEmail: svc.notifyEmail ?? true,
      notifyEmailTo: svc.notifyEmailTo || '',
      enabled: svc.enabled ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        timeout: Number(formData.timeout),
        interval: Number(formData.interval),
        expectedHttpCode: Number(formData.expectedHttpCode) || undefined,
        slaTarget: Number(formData.slaTarget) || undefined,
        slowThresholdMs: Number(formData.slowThresholdMs) || undefined,
        failureThreshold: Number(formData.failureThreshold) || 3,
        sslAlertDaysBefore: Number(formData.sslAlertDaysBefore) || 30,
        groupId: formData.groupId || undefined,
      };

      if (formData.headers && formData.headers.trim()) {
        try {
          payload.headers = JSON.parse(formData.headers);
        } catch {
          alert('Las cabeceras deben ser un JSON válido ej: {"Content-Type": "application/json"}');
          return;
        }
      } else {
        payload.headers = undefined;
      }

      if (editingService) {
        await ServiceAPI.update(editingService.id, payload);
      } else {
        await ServiceAPI.create(payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar el servicio');
    }
  };

  const handleAnalyzeWithAi = async (svc: any) => {
    setIsAiModalOpen(true);
    setAiLoading(true);
    setAiAnalysis('');

    const lastCheck = svc.checks?.[0];
    try {
      const res = await StatsAPI.analyzeWithOllama({
        serviceId: svc.id,
        httpCode: lastCheck?.httpCode,
        errorMessage: lastCheck?.error || (lastCheck?.status === 'DEGRADED' ? 'Fallo lógico o degradación detectada' : 'Error en respuesta'),
        bodySnippet: lastCheck?.bodySnippet || '',
      });
      setAiAnalysis(res.analysis);
    } catch (err: any) {
      setAiAnalysis('No se pudo contactar a Ollama local. Asegúrese de que Ollama esté ejecutándose (`ollama run llama3`).');
    } finally {
      setAiLoading(false);
    }
  };

  // Filter services
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'ALL' || s.groupId === selectedGroup;
    const lastStatus = s.checks?.[0]?.status || 'UNKNOWN';
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'UP' && lastStatus === 'UP') ||
      (selectedStatus === 'DEGRADED' && lastStatus === 'DEGRADED') ||
      (selectedStatus === 'DOWN' && (lastStatus === 'DOWN' || lastStatus === 'TIMEOUT'));

    return matchesSearch && matchesGroup && matchesStatus;
  });

  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case 'WEB_INSTITUCIONAL':
        return <span className="bg-blue-950/80 text-blue-300 border border-blue-800 px-2 py-0.5 rounded text-xs">Web Institucional</span>;
      case 'SISTEMA_WEB':
        return <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded text-xs">Sistema Web</span>;
      case 'API_JSON':
        return <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-xs">API REST / JSON</span>;
      case 'SOAP_WSDL':
        return <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-xs">SOAP WSDL</span>;
      case 'SOAP_OPERACION':
        return <span className="bg-orange-950/80 text-orange-300 border border-orange-800 px-2 py-0.5 rounded text-xs">SOAP Operación</span>;
      case 'LOGIN_CHECK':
        return <span className="bg-purple-950/80 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-xs">Login Check</span>;
      case 'PING':
        return <span className="bg-teal-950/80 text-teal-300 border border-teal-800 px-2 py-0.5 rounded text-xs">Ping / ICMP</span>;
      case 'SSL_CERT':
        return <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded text-xs">Certificado SSL</span>;
      default:
        return <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-gray-100 flex flex-col">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP NAVIGATION BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-800 bg-[#111827]/90 backdrop-blur sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-mono font-bold text-lg text-white tracking-wide">
                SEGIP <span className="text-indigo-400 font-normal">MONITOR</span>
              </span>
              <p className="text-[11px] text-gray-400 font-sans leading-none">Panel de Administración</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick TV Link */}
          <button
            onClick={() => router.push('/tv')}
            className="flex items-center space-x-1.5 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          >
            <Monitor className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Modo TV / NOC</span>
          </button>

          {/* User info & logout */}
          <div className="flex items-center space-x-3 pl-3 border-l border-gray-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{user}</p>
              <p className="text-[10px] text-emerald-400">Admin Activo</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-gray-800/60 hover:bg-red-950/60 hover:text-red-400 text-gray-400 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN CONTENT BODY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-medium">Servicios Monitoreados</span>
            <div className="text-2xl font-bold text-white mt-2">{services.length}</div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Operativos
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-2">
              {services.filter((s) => s.checks?.[0]?.status === 'UP').length}
            </div>
          </div>

          <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-amber-400 font-medium flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Degradados (Auth/Latencia)
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-2">
              {services.filter((s) => s.checks?.[0]?.status === 'DEGRADED').length}
            </div>
          </div>

          <div className="bg-red-950/20 border border-red-800/40 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-red-400 font-medium flex items-center">
              <XCircle className="w-3.5 h-3.5 mr-1" /> Caídos
            </span>
            <div className="text-2xl font-bold text-red-400 mt-2">
              {services.filter((s) => s.checks?.[0]?.status === 'DOWN' || s.checks?.[0]?.status === 'TIMEOUT').length}
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-medium">Uptime Global 24h</span>
            <div className="text-2xl font-bold text-indigo-400 mt-2">{stats?.globalUptime || '100.00'}%</div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-medium">Latencia Promedio</span>
            <div className="text-2xl font-bold text-yellow-400 mt-2">{stats?.avgResponseTime || 0} ms</div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#111827]/80 p-4 rounded-2xl border border-gray-800">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar servicio por nombre o URL/IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter by Group */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Todos los Grupos</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="UP">🟢 Operativos (UP)</option>
              <option value="DEGRADED">🟡 Degradados</option>
              <option value="DOWN">🔴 Caídos (DOWN)</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Servicio</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SERVICES TABLE / LIST */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#111827]/90 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-900/90 text-xs uppercase font-mono text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Servicio & URL / Host</th>
                  <th className="px-5 py-3.5">Tipo & Grupo</th>
                  <th className="px-5 py-3.5">Tiempo Resp.</th>
                  <th className="px-5 py-3.5">Último Check</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                      No se encontraron servicios configurados o no coinciden con el filtro.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((svc) => {
                    const lastCheck = svc.checks?.[0];
                    const status = lastCheck?.status || 'UNKNOWN';
                    const isUp = status === 'UP';
                    const isDegraded = status === 'DEGRADED';
                    const isDown = status === 'DOWN' || status === 'TIMEOUT';
                    const isProbing = probingIds[svc.id];

                    return (
                      <tr
                        key={svc.id}
                        className={`hover:bg-gray-800/40 transition-colors ${
                          !svc.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Status Badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isUp && (
                            <span className="inline-flex items-center space-x-1.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded-full text-xs font-mono font-bold">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 live-indicator-up" />
                              <span>UP</span>
                            </span>
                          )}
                          {isDegraded && (
                            <span className="inline-flex items-center space-x-1.5 bg-amber-950/80 text-amber-300 border border-amber-700 px-2.5 py-1 rounded-full text-xs font-mono font-bold">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              <span>DEGRADED</span>
                            </span>
                          )}
                          {isDown && (
                            <span className="inline-flex items-center space-x-1.5 bg-red-950/80 text-red-400 border border-red-700 px-2.5 py-1 rounded-full text-xs font-mono font-bold">
                              <span className="w-2 h-2 rounded-full bg-red-500 live-indicator-down" />
                              <span>DOWN</span>
                            </span>
                          )}
                          {status === 'UNKNOWN' && (
                            <span className="inline-flex items-center space-x-1.5 bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full text-xs font-mono">
                              <span>PENDIENTE</span>
                            </span>
                          )}
                        </td>

                        {/* Name & URL */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white tracking-tight flex items-center space-x-2">
                            <span>{svc.name}</span>
                            {!svc.enabled && (
                              <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">Deshabilitado</span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-gray-400 truncate max-w-xs md:max-w-md mt-0.5 flex items-center space-x-1">
                            <span>{svc.host || svc.url}</span>
                            {svc.url.startsWith('http') && (
                              <a href={svc.url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-300">
                                <ExternalLink className="w-3 h-3 ml-1 inline" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Type & Group */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div>{getServiceTypeBadge(svc.type)}</div>
                            {svc.group && (
                              <div className="text-xs text-gray-400 flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: svc.group.color }} />
                                <span>{svc.group.name}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Response Time & Details */}
                        <td className="px-5 py-4 whitespace-nowrap font-mono text-xs">
                          <div className="text-white font-bold">
                            {lastCheck?.responseTime ?? lastCheck?.pingAvg ?? '--'} ms
                          </div>
                          {lastCheck?.httpCode && (
                            <div className="text-[11px] text-gray-400">HTTP {lastCheck.httpCode}</div>
                          )}
                          {lastCheck?.sslDaysLeft !== undefined && lastCheck?.sslDaysLeft !== null && (
                            <div className="text-[11px] text-indigo-300">SSL: {lastCheck.sslDaysLeft} días</div>
                          )}
                        </td>

                        {/* Last check time */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-400">
                          {lastCheck ? new Date(lastCheck.timestamp).toLocaleTimeString('es-BO') : 'Nunca'}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                          {/* AI Analysis button if degraded or down */}
                          {(isDegraded || isDown) && (
                            <button
                              onClick={() => handleAnalyzeWithAi(svc)}
                              className="p-1.5 rounded-lg bg-indigo-950/80 text-indigo-300 hover:bg-indigo-900 border border-indigo-700 transition-colors"
                              title="Diagnosticar fallo con Ollama IA"
                            >
                              <Bot className="w-4 h-4 inline mr-1 text-indigo-400" />
                              <span className="text-xs font-semibold">Diagnosticar</span>
                            </button>
                          )}

                          {/* Trigger probe */}
                          <button
                            onClick={() => handleTriggerProbe(svc.id)}
                            disabled={isProbing}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-emerald-400 transition-colors disabled:opacity-50"
                            title="Probar ahora"
                          >
                            <Play className={`w-4 h-4 ${isProbing ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggle(svc.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              svc.enabled ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-red-950 text-red-400'
                            }`}
                            title={svc.enabled ? 'Pausar monitoreo' : 'Reanudar monitoreo'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(svc)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-blue-400 transition-colors"
                            title="Editar servicio"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(svc.id)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-red-950 text-red-400 transition-colors"
                            title="Eliminar servicio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT SERVICE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Server className="w-5 h-5 text-indigo-400" />
                <span>{editingService ? 'Editar Servicio' : 'Añadir Nuevo Servicio'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre del Servicio *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Portal Ciudadano SEGIP"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Tipo de Monitoreo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="WEB_INSTITUCIONAL">🌐 Web Institucional (HTTP 2xx)</option>
                    <option value="SISTEMA_WEB">💻 Sistema Web (Validación de Keyword)</option>
                    <option value="API_JSON">📦 API REST / JSON</option>
                    <option value="SOAP_WSDL">📜 SOAP WSDL (Validar ?wsdl)</option>
                    <option value="SOAP_OPERACION">⚙️ SOAP Operación (Envelope XML)</option>
                    <option value="LOGIN_CHECK">🔐 Login Check (Evalúa Body lógico 200)</option>
                    <option value="PING">📡 Ping / ICMP (Por IP o Dominio)</option>
                    <option value="SSL_CERT">🔒 Certificado SSL (Días de vencimiento)</option>
                  </select>
                </div>
              </div>

              {/* URL or Host */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {formData.type === 'PING' ? 'Dirección IP o Hostname *' : 'URL del Servicio *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.type === 'PING'
                      ? 'ej: 192.168.1.50 o dns.segip.gob.bo'
                      : formData.type === 'SOAP_WSDL'
                      ? 'ej: https://servicios.segip.gob.bo/ws/Verificacion?wsdl'
                      : 'ej: https://portal.segip.gob.bo/login'
                  }
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value, host: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>

              {/* Group selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Grupo / Categoría</label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sin grupo</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Intervalo de Chequeo (seg)</label>
                  <input
                    type="number"
                    min={10}
                    max={86400}
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* SPECIFIC CONFIG FOR LOGIN CHECK */}
              {formData.type === 'LOGIN_CHECK' && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60 space-y-3">
                  <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    Configuración de Validación Lógica de Login
                  </h3>
                  <p className="text-xs text-gray-400">
                    Permite detectar cuando el endpoint retorna HTTP 200 pero el body contiene mensajes de error (ej: credenciales inválidas).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Campo de Éxito en JSON</label>
                      <input
                        type="text"
                        placeholder="ej: token o accessToken"
                        value={formData.loginSuccessField}
                        onChange={(e) => setFormData({ ...formData, loginSuccessField: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Palabra Clave de Fallo en Body</label>
                      <input
                        type="text"
                        placeholder="ej: invalid_credentials o error"
                        value={formData.loginFailureKeyword}
                        onChange={(e) => setFormData({ ...formData, loginFailureKeyword: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">JSON Payload de Prueba (POST Body)</label>
                    <textarea
                      rows={2}
                      placeholder='{"username": "test_monitor", "password": "password_test"}'
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* SPECIFIC CONFIG FOR SOAP */}
              {formData.type === 'SOAP_OPERACION' && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-3">
                  <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Configuración SOAP Envelope
                  </h3>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">SOAPAction Header (Opcional)</label>
                    <input
                      type="text"
                      placeholder='ej: "http://tempuri.org/ConsultarDatos"'
                      value={formData.soapAction}
                      onChange={(e) => setFormData({ ...formData, soapAction: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">XML Request Envelope</label>
                    <textarea
                      rows={3}
                      placeholder="<soapenv:Envelope xmlns:...>...</soapenv:Envelope>"
                      value={formData.soapEnvelope}
                      onChange={(e) => setFormData({ ...formData, soapEnvelope: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Keyword validation for Web / APIs */}
              {(formData.type === 'WEB_INSTITUCIONAL' || formData.type === 'SISTEMA_WEB' || formData.type === 'API_JSON') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Palabra Clave Esperada (Éxito)</label>
                    <input
                      type="text"
                      placeholder="ej: SEGIP o Bienvenido"
                      value={formData.expectedKeyword}
                      onChange={(e) => setFormData({ ...formData, expectedKeyword: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Palabra Inesperada (Marca Degradado)</label>
                    <input
                      type="text"
                      placeholder="ej: Database error o 500"
                      value={formData.unexpectedKeyword}
                      onChange={(e) => setFormData({ ...formData, unexpectedKeyword: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Notification Checkboxes */}
              <div className="pt-2 border-t border-gray-800 flex flex-wrap items-center gap-6">
                <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyTelegram}
                    onChange={(e) => setFormData({ ...formData, notifyTelegram: e.target.checked })}
                    className="rounded bg-gray-900 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Notificar por Telegram</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyEmail}
                    onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                    className="rounded bg-gray-900 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Notificar por Correo</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
                >
                  {editingService ? 'Actualizar' : 'Guardar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: AI INCIDENT DIAGNOSIS (OLLAMA LOCAL) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-indigo-500/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Diagnóstico de Incidente con Ollama IA</h3>
                  <p className="text-xs text-gray-400">Modelo Local Privado</p>
                </div>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 min-h-[160px] flex items-center justify-center">
              {aiLoading ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-indigo-400 font-mono animate-pulse">
                    Ollama analizando código de error y respuesta del servidor...
                  </p>
                </div>
              ) : (
                <div className="text-xs text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {aiAnalysis}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Cerrar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
