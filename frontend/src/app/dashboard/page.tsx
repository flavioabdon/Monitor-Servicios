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
  ExternalLink,
  Shield,
  Layers,
  BarChart3,
  Cpu
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
    if (confirm('¿Está seguro de eliminar este servicio del monitor?')) {
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
      setAiAnalysis('No se pudo contactar a Ollama local. Asegúrese de que el servicio de IA esté activo en el servidor.');
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
        return <span className="bg-[#141A21] text-blue-300 border border-blue-900/60 px-2.5 py-0.5 rounded-lg text-xs font-medium">Web Institucional</span>;
      case 'SISTEMA_WEB':
        return <span className="bg-[#141A21] text-cyan-300 border border-cyan-900/60 px-2.5 py-0.5 rounded-lg text-xs font-medium">Sistema Web</span>;
      case 'API_JSON':
        return <span className="bg-[#141A21] text-[#38B79D] border border-[#38B79D]/30 px-2.5 py-0.5 rounded-lg text-xs font-medium">API REST / JSON</span>;
      case 'SOAP_WSDL':
        return <span className="bg-[#141A21] text-amber-300 border border-amber-900/60 px-2.5 py-0.5 rounded-lg text-xs font-medium">SOAP WSDL</span>;
      case 'SOAP_OPERACION':
        return <span className="bg-[#141A21] text-orange-300 border border-orange-900/60 px-2.5 py-0.5 rounded-lg text-xs font-medium">SOAP Operación</span>;
      case 'LOGIN_CHECK':
        return <span className="bg-[#141A21] text-[#B73852] border border-[#B73852]/30 px-2.5 py-0.5 rounded-lg text-xs font-medium">Login Check</span>;
      case 'PING':
        return <span className="bg-[#141A21] text-teal-300 border border-teal-900/60 px-2.5 py-0.5 rounded-lg text-xs font-medium">Ping / ICMP</span>;
      case 'SSL_CERT':
        return <span className="bg-[#141A21] text-indigo-300 border border-indigo-900/60 px-2.5 py-0.5 rounded-lg text-xs font-medium">Certificado SSL</span>;
      default:
        return <span className="bg-[#141A21] text-gray-300 px-2.5 py-0.5 rounded-lg text-xs font-medium">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#141A21] text-[#FAFAFA] flex flex-col font-sans relative">
      {/* Top Floating Backdrop Card (matching LayoutUser in plataforma-tramites) */}
      <div className="w-full flex justify-center pt-5 px-4 absolute top-0 left-0 right-0 pointer-events-none z-0">
        <div className="w-[96vw] max-w-7xl h-36 rounded-3xl bg-[#1C252E]/90 border border-white/5 opacity-50 blur-[1px]" />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INSTITUTIONAL NAVBAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#1C252E]/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#790026] flex items-center justify-center shadow-md shadow-[#790026]/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-widest text-[#B73852] font-semibold">
                Estado Plurinacional de Bolivia
              </span>
            </div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              SEGIP &bull; Monitor de Servicios
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick TV Link */}
          <button
            onClick={() => router.push('/tv')}
            className="flex items-center space-x-1.5 bg-[#141A21] hover:bg-[#28323D] border border-white/10 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <Monitor className="w-3.5 h-3.5 text-[#38B79D]" />
            <span className="hidden sm:inline">Modo Sala NOC</span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center space-x-3 pl-3 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-[#790026] text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {user[0]?.toUpperCase() || 'A'}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white leading-none">{user}</p>
              <p className="text-[10px] text-[#38B79D] font-medium mt-0.5">Administrador</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-[#141A21] hover:bg-[#BA1B1B]/20 hover:text-red-400 text-[#9FA6AD] border border-white/5 transition-colors"
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6 z-10">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-[#1C252E] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#790026]" />
            <span className="text-xs text-[#9FA6AD] font-medium">Servicios Monitoreados</span>
            <div className="text-2xl font-bold text-white mt-2">{services.length}</div>
          </div>

          <div className="bg-[#1C252E] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#38B79D]" />
            <span className="text-xs text-[#38B79D] font-medium flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Operativos
            </span>
            <div className="text-2xl font-bold text-[#38B79D] mt-2">
              {services.filter((s) => s.checks?.[0]?.status === 'UP').length}
            </div>
          </div>

          <div className="bg-[#1C252E] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#f59e0b]" />
            <span className="text-xs text-amber-400 font-medium flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Degradados
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-2">
              {services.filter((s) => s.checks?.[0]?.status === 'DEGRADED').length}
            </div>
          </div>

          <div className="bg-[#1C252E] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#BA1B1B]" />
            <span className="text-xs text-red-400 font-medium flex items-center">
              <XCircle className="w-3.5 h-3.5 mr-1" /> Caídos
            </span>
            <div className="text-2xl font-bold text-red-400 mt-2">
              {services.filter((s) => s.checks?.[0]?.status === 'DOWN' || s.checks?.[0]?.status === 'TIMEOUT').length}
            </div>
          </div>

          <div className="bg-[#1C252E] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#B73852]" />
            <span className="text-xs text-[#9FA6AD] font-medium">Uptime Global 24h</span>
            <div className="text-2xl font-bold text-[#B73852] mt-2">{stats?.globalUptime || '100.00'}%</div>
          </div>

          <div className="bg-[#1C252E] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500" />
            <span className="text-xs text-[#9FA6AD] font-medium">Latencia Promedio</span>
            <div className="text-2xl font-bold text-yellow-400 mt-2">{stats?.avgResponseTime || 0} ms</div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#1C252E] p-4 rounded-2xl border border-white/10 shadow-sm">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9FA6AD]" />
              <input
                type="text"
                placeholder="Buscar servicio por nombre, URL o IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#141A21] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852] transition-all"
              />
            </div>

            {/* Filter by Group */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-[#141A21] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852] transition-all"
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
              className="bg-[#141A21] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852] transition-all"
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
              className="p-2.5 rounded-xl bg-[#141A21] hover:bg-[#28323D] text-[#FAFAFA] border border-white/10 transition-colors shadow-sm"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center space-x-2 bg-[#790026] hover:bg-[#9c1b3e] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-[#790026]/30 transition-all active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Servicio</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SERVICES TABLE / LIST */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#1C252E] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#FAFAFA]">
              <thead className="bg-[#141A21] text-xs font-semibold text-[#9FA6AD] border-b border-white/10">
                <tr>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Servicio & URL / Host</th>
                  <th className="px-5 py-3.5">Tipo & Grupo</th>
                  <th className="px-5 py-3.5">Tiempo Resp.</th>
                  <th className="px-5 py-3.5">Último Chequeo</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#9FA6AD]">
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
                        className={`hover:bg-[#28323D]/50 transition-colors ${
                          !svc.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Status Badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isUp && (
                            <span className="inline-flex items-center space-x-1.5 bg-[#38B79D]/15 text-[#38B79D] border border-[#38B79D]/30 px-2.5 py-1 rounded-full text-xs font-bold">
                              <span className="w-2 h-2 rounded-full bg-[#38B79D] live-indicator-up" />
                              <span>UP</span>
                            </span>
                          )}
                          {isDegraded && (
                            <span className="inline-flex items-center space-x-1.5 bg-amber-950/40 text-amber-300 border border-amber-600/40 px-2.5 py-1 rounded-full text-xs font-bold">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              <span>DEGRADED</span>
                            </span>
                          )}
                          {isDown && (
                            <span className="inline-flex items-center space-x-1.5 bg-[#BA1B1B]/20 text-red-300 border border-[#BA1B1B]/40 px-2.5 py-1 rounded-full text-xs font-bold">
                              <span className="w-2 h-2 rounded-full bg-[#BA1B1B] live-indicator-down" />
                              <span>DOWN</span>
                            </span>
                          )}
                          {status === 'UNKNOWN' && (
                            <span className="inline-flex items-center space-x-1.5 bg-[#141A21] text-[#9FA6AD] px-2.5 py-1 rounded-full text-xs font-semibold border border-white/5">
                              <span>PENDIENTE</span>
                            </span>
                          )}
                        </td>

                        {/* Name & URL */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white tracking-tight flex items-center space-x-2">
                            <span>{svc.name}</span>
                            {!svc.enabled && (
                              <span className="text-[10px] text-[#9FA6AD] bg-[#141A21] border border-white/5 px-1.5 py-0.5 rounded">Deshabilitado</span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-[#9FA6AD] truncate max-w-xs md:max-w-md mt-0.5 flex items-center space-x-1">
                            <span>{svc.host || svc.url}</span>
                            {svc.url.startsWith('http') && (
                              <a href={svc.url} target="_blank" rel="noreferrer" className="text-[#9FA6AD] hover:text-white">
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
                              <div className="text-xs text-[#9FA6AD] flex items-center space-x-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: svc.group.color }} />
                                <span>{svc.group.name}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Response Time & Details */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs">
                          <div className="text-white font-bold font-mono">
                            {lastCheck?.responseTime ?? lastCheck?.pingAvg ?? '--'} ms
                          </div>
                          {lastCheck?.httpCode && (
                            <div className="text-[11px] text-[#9FA6AD]">HTTP {lastCheck.httpCode}</div>
                          )}
                          {lastCheck?.sslDaysLeft !== undefined && lastCheck?.sslDaysLeft !== null && (
                            <div className="text-[11px] text-[#B73852]">SSL: {lastCheck.sslDaysLeft} días</div>
                          )}
                        </td>

                        {/* Last check time */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-[#9FA6AD]">
                          {lastCheck ? new Date(lastCheck.timestamp).toLocaleTimeString('es-BO') : 'Nunca'}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                          {/* AI Analysis button if degraded or down */}
                          {(isDegraded || isDown) && (
                            <button
                              onClick={() => handleAnalyzeWithAi(svc)}
                              className="p-1.5 rounded-lg bg-[#790026]/20 text-[#B73852] hover:bg-[#790026]/40 border border-[#790026]/50 transition-colors"
                              title="Diagnosticar fallo con Ollama IA"
                            >
                              <Bot className="w-4 h-4 inline mr-1 text-[#B73852]" />
                              <span className="text-xs font-semibold">Diagnosticar</span>
                            </button>
                          )}

                          {/* Trigger probe */}
                          <button
                            onClick={() => handleTriggerProbe(svc.id)}
                            disabled={isProbing}
                            className="p-1.5 rounded-lg bg-[#141A21] hover:bg-[#28323D] text-[#38B79D] border border-white/10 transition-colors disabled:opacity-50"
                            title="Probar ahora"
                          >
                            <Play className={`w-4 h-4 ${isProbing ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggle(svc.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              svc.enabled ? 'bg-[#141A21] text-[#FAFAFA] hover:bg-[#28323D] border-white/10' : 'bg-[#BA1B1B]/20 text-red-400 border-[#BA1B1B]/30'
                            }`}
                            title={svc.enabled ? 'Pausar monitoreo' : 'Reanudar monitoreo'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(svc)}
                            className="p-1.5 rounded-lg bg-[#141A21] hover:bg-[#28323D] text-blue-400 border border-white/10 transition-colors"
                            title="Editar servicio"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(svc.id)}
                            className="p-1.5 rounded-lg bg-[#141A21] hover:bg-[#BA1B1B]/20 text-red-400 border border-white/10 transition-colors"
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
          <div className="bg-[#1C252E] border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#790026] via-[#B73852] to-[#38B79D]" />

            <div className="flex items-center justify-between border-b border-white/10 pb-3 pt-1">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Server className="w-5 h-5 text-[#B73852]" />
                <span>{editingService ? 'Editar Servicio de Monitoreo' : 'Añadir Nuevo Servicio de Monitoreo'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#9FA6AD] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#FAFAFA] mb-1">Nombre del Servicio *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Portal Ciudadano SEGIP"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#141A21] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#FAFAFA] mb-1">Tipo de Monitoreo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#141A21] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852]"
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
                <label className="block text-xs font-semibold text-[#FAFAFA] mb-1">
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
                  className="w-full px-3 py-2 bg-[#141A21] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852] font-mono text-xs"
                />
              </div>

              {/* Group selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#FAFAFA] mb-1">Grupo / Categoría</label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#141A21] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852]"
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
                  <label className="block text-xs font-semibold text-[#FAFAFA] mb-1">Intervalo de Chequeo (seg)</label>
                  <input
                    type="number"
                    min={10}
                    max={86400}
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#141A21] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852]"
                  />
                </div>
              </div>

              {/* SPECIFIC CONFIG FOR LOGIN CHECK */}
              {formData.type === 'LOGIN_CHECK' && (
                <div className="p-4 rounded-2xl bg-[#141A21] border border-[#B73852]/30 space-y-3">
                  <h3 className="text-xs font-bold text-[#B73852] uppercase tracking-wider">
                    Configuración de Validación Lógica de Login
                  </h3>
                  <p className="text-xs text-[#9FA6AD]">
                    Permite detectar cuando el endpoint retorna HTTP 200 pero el body contiene mensajes de error (ej: credenciales inválidas).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#FAFAFA] mb-1">Campo de Éxito en JSON</label>
                      <input
                        type="text"
                        placeholder="ej: token o accessToken"
                        value={formData.loginSuccessField}
                        onChange={(e) => setFormData({ ...formData, loginSuccessField: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1C252E] border border-white/10 rounded-xl text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#FAFAFA] mb-1">Palabra Clave de Fallo en Body</label>
                      <input
                        type="text"
                        placeholder="ej: invalid_credentials o error"
                        value={formData.loginFailureKeyword}
                        onChange={(e) => setFormData({ ...formData, loginFailureKeyword: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1C252E] border border-white/10 rounded-xl text-white text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#FAFAFA] mb-1">JSON Payload de Prueba (POST Body)</label>
                    <textarea
                      rows={2}
                      placeholder='{"username": "test_monitor", "password": "password_test"}'
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1C252E] border border-white/10 rounded-xl text-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* SPECIFIC CONFIG FOR SOAP */}
              {formData.type === 'SOAP_OPERACION' && (
                <div className="p-4 rounded-2xl bg-[#141A21] border border-amber-700/40 space-y-3">
                  <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Configuración SOAP Envelope
                  </h3>
                  <div>
                    <label className="block text-xs text-[#FAFAFA] mb-1">SOAPAction Header (Opcional)</label>
                    <input
                      type="text"
                      placeholder='ej: "http://tempuri.org/ConsultarDatos"'
                      value={formData.soapAction}
                      onChange={(e) => setFormData({ ...formData, soapAction: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1C252E] border border-white/10 rounded-xl text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#FAFAFA] mb-1">XML Request Envelope</label>
                    <textarea
                      rows={3}
                      placeholder="<soapenv:Envelope xmlns:...>...</soapenv:Envelope>"
                      value={formData.soapEnvelope}
                      onChange={(e) => setFormData({ ...formData, soapEnvelope: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1C252E] border border-white/10 rounded-xl text-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Keyword validation for Web / APIs */}
              {(formData.type === 'WEB_INSTITUCIONAL' || formData.type === 'SISTEMA_WEB' || formData.type === 'API_JSON') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#FAFAFA] mb-1">Palabra Clave Esperada (Éxito)</label>
                    <input
                      type="text"
                      placeholder="ej: SEGIP o Bienvenido"
                      value={formData.expectedKeyword}
                      onChange={(e) => setFormData({ ...formData, expectedKeyword: e.target.value })}
                      className="w-full px-3 py-2 bg-[#141A21] border border-white/10 rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#FAFAFA] mb-1">Palabra Inesperada (Marca Degradado)</label>
                    <input
                      type="text"
                      placeholder="ej: Database error o 500"
                      value={formData.unexpectedKeyword}
                      onChange={(e) => setFormData({ ...formData, unexpectedKeyword: e.target.value })}
                      className="w-full px-3 py-2 bg-[#141A21] border border-white/10 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Notification Checkboxes */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-6">
                <label className="flex items-center space-x-2 text-xs text-[#FAFAFA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyTelegram}
                    onChange={(e) => setFormData({ ...formData, notifyTelegram: e.target.checked })}
                    className="rounded bg-[#141A21] border-white/10 text-[#790026] focus:ring-[#790026]"
                  />
                  <span>Notificar por Telegram</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-[#FAFAFA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyEmail}
                    onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                    className="rounded bg-[#141A21] border-white/10 text-[#790026] focus:ring-[#790026]"
                  />
                  <span>Notificar por Correo</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#141A21] hover:bg-[#28323D] text-[#9FA6AD] hover:text-white rounded-xl text-sm font-semibold transition-colors border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#790026] hover:bg-[#9c1b3e] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#790026]/30 transition-all active:scale-[0.99]"
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
          <div className="bg-[#1C252E] border border-[#B73852]/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#790026] to-[#B73852]" />

            <div className="flex items-center justify-between border-b border-white/10 pb-3 pt-1">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#790026]/20 text-[#B73852] border border-[#790026]/40">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Diagnóstico de Incidente con IA</h3>
                  <p className="text-xs text-[#9FA6AD]">Asistente Ollama Local</p>
                </div>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-[#9FA6AD] hover:text-white">
                ✕
              </button>
            </div>

            <div className="bg-[#141A21] border border-white/10 rounded-2xl p-4 min-h-[160px] flex items-center justify-center">
              {aiLoading ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-3 border-[#B73852] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[#B73852] font-medium animate-pulse">
                    Analizando logs y respuesta técnica del servidor...
                  </p>
                </div>
              ) : (
                <div className="text-xs text-[#FAFAFA] whitespace-pre-wrap font-sans leading-relaxed">
                  {aiAnalysis}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 bg-[#790026] hover:bg-[#9c1b3e] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#790026]/20"
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
