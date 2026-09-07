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
  Settings,
  Mail,
  Send,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  BarChart2,
  ChevronDown,
  X
} from 'lucide-react';
import { ServiceAPI, StatsAPI, GroupAPI, AlertAPI, ConfigAPI } from '@/lib/api';
import SegipLogo from '@/components/SegipLogo';
import ServiceMetricsModal from '@/components/ServiceMetricsModal';
import PostmanRequestBuilder, {
  RequestBuilderValue,
  defaultRequestBuilderValue,
  builderToServicePayload,
} from '@/components/PostmanRequestBuilder';

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

  // Service Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [metricsService, setMetricsService] = useState<any>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [probingIds, setProbingIds] = useState<Record<string, boolean>>({});
  // Postman-style Request Builder state (for API_JSON & LOGIN_CHECK types)
  const [builderValue, setBuilderValue] = useState<RequestBuilderValue>(defaultRequestBuilderValue());
  const [serviceFormTab, setServiceFormTab] = useState<'basic' | 'request' | 'alerts'>('basic');

  // Notification Config Modal states
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configTab, setConfigTab] = useState<'telegram' | 'email'>('telegram');
  const [configSaving, setConfigSaving] = useState<boolean>(false);
  const [showSmtpPass, setShowSmtpPass] = useState<boolean>(false);
  const [configData, setConfigData] = useState({
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
    emailEnabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'SEGIP Monitor <notificaciones@segip.gob.bo>',
    alertEmailTo: '',
  });

  // Test notification states
  const [testTelegramLoading, setTestTelegramLoading] = useState<boolean>(false);
  const [testTelegramStatus, setTestTelegramStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState<boolean>(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>('');

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

  const fetchNotificationConfig = async () => {
    try {
      const cfg = await ConfigAPI.getNotifications();
      setConfigData({
        telegramEnabled: cfg.telegramEnabled ?? false,
        telegramBotToken: cfg.telegramBotToken || '',
        telegramChatId: cfg.telegramChatId || '',
        emailEnabled: cfg.emailEnabled ?? false,
        smtpHost: cfg.smtpHost || '',
        smtpPort: cfg.smtpPort || 587,
        smtpSecure: cfg.smtpSecure ?? false,
        smtpUser: cfg.smtpUser || '',
        smtpPass: cfg.smtpPass || '',
        smtpFrom: cfg.smtpFrom || 'SEGIP Monitor <notificaciones@segip.gob.bo>',
        alertEmailTo: cfg.alertEmailTo || '',
      });
      if (cfg.alertEmailTo && !testEmailRecipient) {
        setTestEmailRecipient(cfg.alertEmailTo.split(',')[0].trim());
      }
    } catch (err) {
      console.error('Error fetching notification config:', err);
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

  const handleOpenConfigModal = async () => {
    await fetchNotificationConfig();
    setTestTelegramStatus(null);
    setTestEmailStatus(null);
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setConfigSaving(true);
      await ConfigAPI.saveNotifications({
        ...configData,
        smtpPort: Number(configData.smtpPort),
      });
      alert('Configuración de notificaciones guardada correctamente.');
      setIsConfigModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar la configuración');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      setTestTelegramLoading(true);
      setTestTelegramStatus(null);
      const res = await ConfigAPI.testTelegram({
        botToken: configData.telegramBotToken || undefined,
        chatId: configData.telegramChatId || undefined,
      });
      setTestTelegramStatus({ success: true, message: res.message || 'Mensaje de prueba enviado exitosamente' });
    } catch (err: any) {
      setTestTelegramStatus({
        success: false,
        message: err.response?.data?.error || 'Fallo al conectar con Telegram. Revise el Bot Token y Chat ID.',
      });
    } finally {
      setTestTelegramLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailRecipient) {
      setTestEmailStatus({ success: false, message: 'Ingrese un correo destinatario para realizar la prueba.' });
      return;
    }
    try {
      setTestEmailLoading(true);
      setTestEmailStatus(null);
      const res = await ConfigAPI.testEmail({
        smtpHost: configData.smtpHost,
        smtpPort: Number(configData.smtpPort),
        smtpSecure: configData.smtpSecure,
        smtpUser: configData.smtpUser,
        smtpPass: configData.smtpPass,
        smtpFrom: configData.smtpFrom,
        testRecipient: testEmailRecipient,
      });
      setTestEmailStatus({ success: true, message: res.message || 'Correo de prueba enviado con éxito' });
    } catch (err: any) {
      setTestEmailStatus({
        success: false,
        message: err.response?.data?.error || 'Fallo al enviar correo. Verifique el host SMTP, puerto y credenciales.',
      });
    } finally {
      setTestEmailLoading(false);
    }
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
    setBuilderValue(defaultRequestBuilderValue());
    setServiceFormTab('basic');
    setFormData({
      name: '',
      description: '',
      type: 'API_JSON',
      url: '',
      host: '',
      groupId: groups[0]?.id || '',
      method: 'POST',
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
    setServiceFormTab('basic');
    // Rebuild builder value from saved service data
    const existingHeaders = svc.headers as Record<string, string> | null;
    const headerRows = existingHeaders
      ? Object.entries(existingHeaders)
        .filter(([k]) => k !== 'Authorization' && k !== 'Content-Type')
        .map(([k, v]) => ({ id: Math.random().toString(36).slice(2), key: k, value: v as string, enabled: true }))
      : [];
    if (headerRows.length === 0) headerRows.push({ id: Math.random().toString(36).slice(2), key: '', value: '', enabled: true });

    // Detect auth from headers
    const authHeader = existingHeaders?.['Authorization'] || '';
    let builderAuth: Partial<RequestBuilderValue> = { authType: 'none' };
    if (authHeader.startsWith('Bearer ')) {
      builderAuth = { authType: 'bearer', authToken: authHeader.replace('Bearer ', '') };
    } else if (authHeader.startsWith('Basic ')) {
      try {
        const [u, p] = atob(authHeader.replace('Basic ', '')).split(':');
        builderAuth = { authType: 'basic', authUsername: u, authPassword: p };
      } catch { }
    }

    // Detect body type
    let bodyType: RequestBuilderValue['bodyType'] = 'none';
    let bodyJson = '{\n  \n}';
    if (svc.body) {
      try {
        bodyJson = JSON.stringify(JSON.parse(svc.body), null, 2);
        bodyType = 'json';
      } catch {
        bodyType = 'raw';
      }
    }

    setBuilderValue({
      ...defaultRequestBuilderValue(),
      method: svc.method || 'POST',
      url: svc.url || '',
      headers: headerRows,
      bodyType,
      bodyJson,
      expectedHttpCode: svc.expectedHttpCode || 200,
      expectedKeyword: svc.expectedKeyword || '',
      unexpectedKeyword: svc.unexpectedKeyword || '',
      followRedirects: svc.followRedirects ?? true,
      timeout: svc.timeout || 10000,
      ...builderAuth,
    });

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
      const isPostmanType = formData.type === 'API_JSON' || formData.type === 'LOGIN_CHECK';

      let payload: any = {
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

      if (isPostmanType) {
        // Merge Postman builder fields into the payload
        if (!builderValue.url.trim() && !formData.url.trim()) {
          alert('La URL del servicio es obligatoria.');
          return;
        }
        const requestPayload = builderToServicePayload(builderValue);
        payload = {
          ...payload,
          url: builderValue.url || formData.url,
          host: builderValue.url || formData.url,
          method: requestPayload.method,
          headers: requestPayload.headers,
          body: requestPayload.body,
          expectedHttpCode: requestPayload.expectedHttpCode,
          expectedKeyword: requestPayload.expectedKeyword,
          unexpectedKeyword: requestPayload.unexpectedKeyword,
          followRedirects: requestPayload.followRedirects,
          timeout: requestPayload.timeout,
        };
      } else if (formData.headers && formData.headers.trim()) {
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
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold">Web Institucional</span>;
      case 'SISTEMA_WEB':
        return <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold">Sistema Web</span>;
      case 'API_JSON':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold">API REST / JSON</span>;
      case 'SOAP_WSDL':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold">SOAP WSDL</span>;
      case 'SOAP_OPERACION':
        return <span className="bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold">SOAP Operación</span>;
      case 'LOGIN_CHECK':
        return <span className="bg-rose-50 text-[#245b87] border border-rose-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold">Login Check</span>;
      case 'PING':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold">Ping / ICMP</span>;
      case 'SSL_CERT':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold">Certificado SSL</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg text-xs font-semibold">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans relative">
      {/* Top Floating Backdrop Card (matching LayoutUser in plataforma-tramites) */}
      <div className="w-full flex justify-center pt-5 px-4 absolute top-0 left-0 right-0 pointer-events-none z-0">
        <div className="w-[96vw] max-w-7xl h-40 rounded-3xl bg-[#b0697f]/15 border border-[#b0697f]/25 blur-[1px]" />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INSTITUTIONAL NAVBAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <SegipLogo size="md" />
          <div className="hidden 2xl:block border-l border-slate-200 pl-4 py-0.5">
            <span className="text-[11px] font-semibold text-slate-600 tracking-tight block">
              Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas - SEGIP
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Notification Config Button */}
          {/* <button
            onClick={handleOpenConfigModal}
            className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
            title="Configurar Notificaciones de Correo y Telegram"
          >
            <Settings className="w-3.5 h-3.5 text-[#245b87]" />
            <span className="hidden sm:inline">Configuración de Alertas</span>
          </button> */}

          {/* Quick TV Link */}
          <button
            onClick={() => router.push('/tv')}
            className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <Monitor className="w-3.5 h-3.5 text-[#16a34a]" />
            <span className="hidden sm:inline">Pantalla</span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center space-x-3 pl-2.5 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-[#245b87] text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {user[0]?.toUpperCase() || 'A'}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-none">{user}</p>
              <p className="text-[10px] text-[#16a34a] font-medium mt-0.5">Administrador</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 border border-slate-200 transition-colors"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#16a34a]" />
            <span className="text-xs text-[#16a34a] font-semibold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Operativos
            </span>
            <div className="text-2xl font-bold text-[#16a34a] mt-2">
              {services.filter((s) => s.checks?.[0]?.status === 'UP').length}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#d97706]" />
            <span className="text-xs text-amber-600 font-semibold flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Degradados
            </span>
            <div className="text-2xl font-bold text-amber-600 mt-2">
              {services.filter((s) => s.checks?.[0]?.status === 'DEGRADED').length}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#BA1B1B]" />
            <span className="text-xs text-red-600 font-semibold flex items-center">
              <XCircle className="w-3.5 h-3.5 mr-1" /> Caídos
            </span>
            <div className="text-2xl font-bold text-red-600 mt-2">
              {services.filter((s) => s.checks?.[0]?.status === 'DOWN' || s.checks?.[0]?.status === 'TIMEOUT').length}
            </div>
          </div>

        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar servicio por nombre, URL o IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87] transition-all"
              />
            </div>

            {/* Filter by Group */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87] transition-all"
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87] transition-all"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="UP">Operativos (UP)</option>
              <option value="DEGRADED">Degradados (DEGRADED)</option>
              <option value="DOWN">Caídos (DOWN / TIMEOUT)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shadow-sm"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenConfigModal}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border border-slate-200"
            >
              <Settings className="w-4 h-4 text-[#245b87]" />
              <span>Configuración Alertas</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center space-x-2 bg-[#245b87] hover:bg-[#1b496d] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-[#245b87]/20 transition-all active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Servicio</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SERVICES TABLE / LIST */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Servicio & URL / Host</th>
                  <th className="px-5 py-3.5">Tipo & Grupo</th>
                  <th className="px-5 py-3.5">Tiempo Resp.</th>
                  <th className="px-5 py-3.5">Última Verificación</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
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
                        className={`hover:bg-slate-50/80 transition-colors ${!svc.enabled ? 'opacity-50' : ''
                          }`}
                      >
                        {/* Status Badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isUp && (
                            <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-[#16a34a] border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                              <span className="w-2 h-2 rounded-full bg-[#16a34a] live-indicator-up" />
                              <span>UP</span>
                            </span>
                          )}
                          {isDegraded && (
                            <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span>DEGRADED</span>
                            </span>
                          )}
                          {isDown && (
                            <span className="inline-flex items-center space-x-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-bold">
                              <span className="w-2 h-2 rounded-full bg-[#BA1B1B] live-indicator-down" />
                              <span>DOWN</span>
                            </span>
                          )}
                          {status === 'UNKNOWN' && (
                            <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200">
                              <span>PENDIENTE</span>
                            </span>
                          )}
                        </td>

                        {/* Name & URL */}
                        <td
                          className="px-5 py-4 cursor-pointer group"
                          onClick={() => setMetricsService(svc)}
                          title="Haga clic para ver gráficos y métricas de este servicio"
                        >
                          <div className="font-bold text-slate-900 group-hover:text-[#245b87] transition-colors tracking-tight flex items-center space-x-2">
                            <span>{svc.name}</span>
                            <BarChart2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#245b87]" />
                            {!svc.enabled && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Deshabilitado</span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-slate-500 truncate max-w-xs md:max-w-md mt-0.5 flex items-center space-x-1">
                            <span>{svc.host || svc.url}</span>
                            {svc.url.startsWith('http') && (
                              <a
                                href={svc.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-400 hover:text-slate-700"
                              >
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
                              <div className="text-xs text-slate-500 flex items-center space-x-1.5 font-medium">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: svc.group.color }} />
                                <span>{svc.group.name}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Response Time & Details */}
                        <td
                          className="px-5 py-4 whitespace-nowrap text-xs cursor-pointer group"
                          onClick={() => setMetricsService(svc)}
                          title="Ver historial de latencia"
                        >
                          <div className="text-slate-900 font-bold font-mono group-hover:text-[#245b87] flex items-center space-x-1">
                            <span>{lastCheck?.responseTime ?? lastCheck?.pingAvg ?? '--'} ms</span>
                            <BarChart2 className="w-3 h-3 text-[#245b87] opacity-60 group-hover:opacity-100" />
                          </div>
                          {lastCheck?.httpCode && (
                            <div className="text-[11px] text-slate-500">HTTP {lastCheck.httpCode}</div>
                          )}
                          {lastCheck?.sslDaysLeft !== undefined && lastCheck?.sslDaysLeft !== null && (
                            <div className="text-[11px] text-[#245b87] font-semibold">SSL: {lastCheck.sslDaysLeft} días</div>
                          )}
                        </td>

                        {/* Last check time */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                          {lastCheck ? new Date(lastCheck.timestamp).toLocaleTimeString('es-BO') : 'Nunca'}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                          {/* Metrics / Chart button */}
                          <button
                            onClick={() => setMetricsService(svc)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#245b87] border border-rose-200 transition-colors"
                            title="Ver métricas y gráficos estilo Google Cloud"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>

                          {/* AI Analysis button if degraded or down */}
                          {(isDegraded || isDown) && (
                            <button
                              onClick={() => handleAnalyzeWithAi(svc)}
                              className="p-1.5 rounded-lg bg-rose-50 text-[#245b87] hover:bg-rose-100 border border-rose-200 transition-colors"
                              title="Diagnosticar fallo con Ollama IA"
                            >
                              <Bot className="w-4 h-4 inline mr-1 text-[#245b87]" />
                              <span className="text-xs font-semibold">Diagnosticar</span>
                            </button>
                          )}

                          {/* Trigger probe */}
                          <button
                            onClick={() => handleTriggerProbe(svc.id)}
                            disabled={isProbing}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-[#16a34a] border border-slate-200 transition-colors disabled:opacity-50"
                            title="Probar ahora"
                          >
                            <Play className={`w-4 h-4 ${isProbing ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggle(svc.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${svc.enabled ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200' : 'bg-red-50 text-red-600 border-red-200'
                              }`}
                            title={svc.enabled ? 'Pausar monitoreo' : 'Reanudar monitoreo'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(svc)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200 transition-colors"
                            title="Editar servicio"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(svc.id)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-red-600 border border-slate-200 transition-colors"
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
      {/* MODAL: NOTIFICATIONS CONFIGURATION (TELEGRAM & CORREO SMTP) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#245b87] via-[#B73852] to-[#16a34a]" />

            <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#245b87] border border-rose-200 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-none">Configuración de Alertas & Notificaciones</h2>
                  <p className="text-xs text-slate-500 mt-1">Gestione los canales de aviso institucional ante caídas o degradaciones</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs for Telegram & Email */}
            <div className="flex border-b border-slate-200 space-x-2">
              <button
                type="button"
                onClick={() => setConfigTab('telegram')}
                className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${configTab === 'telegram'
                  ? 'border-[#245b87] text-[#245b87] bg-rose-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Send className="w-4 h-4 text-blue-500" />
                <span>Telegram Bot</span>
                {configData.telegramEnabled && (
                  <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setConfigTab('email')}
                className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${configTab === 'email'
                  ? 'border-[#245b87] text-[#245b87] bg-rose-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Mail className="w-4 h-4 text-red-500" />
                <span>Correo Electrónico (SMTP)</span>
                {configData.emailEnabled && (
                  <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                )}
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-sm">
              {/* TAB 1: TELEGRAM */}
              {configTab === 'telegram' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Activar Alertas por Telegram</h3>
                      <p className="text-xs text-slate-500">Enviar mensaje automático a grupos o canales de TI ante cualquier incidente.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configData.telegramEnabled}
                        onChange={(e) => setConfigData({ ...configData, telegramEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#245b87]"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Token del Bot de Telegram (TELEGRAM_BOT_TOKEN)
                    </label>
                    <input
                      type="text"
                      placeholder="ej: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      value={configData.telegramBotToken}
                      onChange={(e) => setConfigData({ ...configData, telegramBotToken: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Obtén el token creando un bot con <b>@BotFather</b> en Telegram.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chat ID o ID del Canal / Grupo (TELEGRAM_CHAT_ID)
                    </label>
                    <input
                      type="text"
                      placeholder="ej: -1001234567890 o 987654321"
                      value={configData.telegramChatId}
                      onChange={(e) => setConfigData({ ...configData, telegramChatId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Para grupos o canales asegúrate de añadir al bot como administrador.</p>
                  </div>

                  {/* Test Telegram Box */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-blue-900">Probar Notificación de Telegram</h4>
                        <p className="text-[11px] text-blue-700">Envía un mensaje de prueba con la configuración actual.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        disabled={testTelegramLoading || !configData.telegramBotToken || !configData.telegramChatId}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                      >
                        {testTelegramLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Probar Telegram</span>
                      </button>
                    </div>

                    {testTelegramStatus && (
                      <div
                        className={`p-2.5 rounded-xl text-xs flex items-start space-x-2 ${testTelegramStatus.success
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-red-100 text-red-900 border border-red-300'
                          }`}
                      >
                        {testTelegramStatus.success ? (
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{testTelegramStatus.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: EMAIL / SMTP */}
              {configTab === 'email' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Activar Alertas por Correo Electrónico</h3>
                      <p className="text-xs text-slate-500">Enviar reporte HTML con detalles del error ante indisponibilidad.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configData.emailEnabled}
                        onChange={(e) => setConfigData({ ...configData, emailEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#245b87]"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Servidor SMTP Host *</label>
                      <input
                        type="text"
                        placeholder="ej: smtp.segip.gob.bo o mail.gob.bo"
                        value={configData.smtpHost}
                        onChange={(e) => setConfigData({ ...configData, smtpHost: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Puerto SMTP</label>
                      <input
                        type="number"
                        placeholder="587 o 465"
                        value={configData.smtpPort}
                        onChange={(e) => setConfigData({ ...configData, smtpPort: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={configData.smtpSecure}
                      onChange={(e) => setConfigData({ ...configData, smtpSecure: e.target.checked })}
                      className="rounded border-slate-300 text-[#245b87] focus:ring-[#245b87]"
                    />
                    <label htmlFor="smtpSecure" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Conexión SSL/TLS directa (habitualmente para puerto 465)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Usuario SMTP</label>
                      <input
                        type="text"
                        placeholder="ej: alertas@segip.gob.bo"
                        value={configData.smtpUser}
                        onChange={(e) => setConfigData({ ...configData, smtpUser: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña SMTP</label>
                      <div className="relative">
                        <input
                          type={showSmtpPass ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={configData.smtpPass}
                          onChange={(e) => setConfigData({ ...configData, smtpPass: e.target.value })}
                          className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPass(!showSmtpPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Remitente Visible (From)</label>
                      <input
                        type="text"
                        placeholder='ej: SEGIP Monitor <alertas@segip.gob.bo>'
                        value={configData.smtpFrom}
                        onChange={(e) => setConfigData({ ...configData, smtpFrom: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Destinatarios Globales (Separados por coma)</label>
                      <input
                        type="text"
                        placeholder="ej: noc@segip.gob.bo, soporte@segip.gob.bo"
                        value={configData.alertEmailTo}
                        onChange={(e) => setConfigData({ ...configData, alertEmailTo: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      />
                    </div>
                  </div>

                  {/* Test Email Box */}
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-2.5">
                    <h4 className="text-xs font-bold text-[#245b87]">Probar Envío de Correo SMTP</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        placeholder="Correo destinatario para la prueba (ej: tu@segip.gob.bo)"
                        value={testEmailRecipient}
                        onChange={(e) => setTestEmailRecipient(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#245b87]"
                      />
                      <button
                        type="button"
                        onClick={handleTestEmail}
                        disabled={testEmailLoading || !configData.smtpHost || !testEmailRecipient}
                        className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-[#245b87] hover:bg-[#1b496d] text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                      >
                        {testEmailLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                        <span>Enviar Prueba</span>
                      </button>
                    </div>

                    {testEmailStatus && (
                      <div
                        className={`p-2.5 rounded-xl text-xs flex items-start space-x-2 ${testEmailStatus.success
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-red-100 text-red-900 border border-red-300'
                          }`}
                      >
                        {testEmailStatus.success ? (
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{testEmailStatus.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-5 py-2 bg-[#245b87] hover:bg-[#1b496d] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#245b87]/20 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {configSaving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT SERVICE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`bg-white border border-slate-200 rounded-3xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto relative ${(formData.type === 'API_JSON' || formData.type === 'LOGIN_CHECK') ? 'max-w-4xl' : 'max-w-2xl'
            }`}>
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#245b87] via-[#B73852] to-[#16a34a]" />

            <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-1">
              <div className="flex items-center space-x-2.5">
                <Server className="w-5 h-5 text-[#245b87]" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-none">
                    {editingService ? 'Editar Servicio' : 'Añadir Nuevo Servicio de Monitoreo'}
                  </h2>
                  {(formData.type === 'API_JSON' || formData.type === 'LOGIN_CHECK') && (
                    <p className="text-xs text-slate-500 mt-0.5">Configurador de Peticiones HTTP estilo Postman</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-sm">
              {/* ─── Service Name & Type Row ─── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Servicio *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: API de Identificación SEGIP"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Monitoreo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                  >
                    <option value="WEB_INSTITUCIONAL">Web Institucional (HTTP 2xx)</option>
                    <option value="SISTEMA_WEB">Sistema Web (Validación de Keyword)</option>
                    <option value="API_JSON">API REST / JSON (Builder Postman)</option>
                    <option value="SOAP_WSDL">SOAP WSDL (Validar ?wsdl)</option>
                    <option value="SOAP_OPERACION">SOAP Operación (Envelope XML)</option>
                    <option value="LOGIN_CHECK">Login Check (Validación Lógica)</option>
                    <option value="PING">Ping / ICMP (Por IP o Dominio)</option>
                    <option value="SSL_CERT">Certificado SSL (Días de vencimiento)</option>
                  </select>
                </div>
              </div>

              {/* ─── POSTMAN BUILDER (for API_JSON & LOGIN_CHECK) ─── */}
              {(formData.type === 'API_JSON' || formData.type === 'LOGIN_CHECK') && (
                <div className="space-y-3">
                  {/* Postman-style URL + Method bar */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">URL del Endpoint *</label>
                    <div className="flex items-stretch border border-slate-300 rounded-xl overflow-hidden bg-slate-50 focus-within:border-[#245b87] focus-within:ring-1 focus-within:ring-[#245b87] transition-all">
                      {/* Method selector */}
                      <div className="relative flex-shrink-0">
                        <select
                          value={builderValue.method}
                          onChange={(e) => setBuilderValue({ ...builderValue, method: e.target.value })}
                          className={`h-full pl-3 pr-7 appearance-none font-bold text-xs border-r border-slate-300 bg-transparent focus:outline-none focus:ring-0 ${{
                            GET: 'text-emerald-700',
                            POST: 'text-amber-700',
                            PUT: 'text-blue-700',
                            PATCH: 'text-purple-700',
                            DELETE: 'text-red-700',
                            HEAD: 'text-slate-700',
                            OPTIONS: 'text-teal-700',
                          }[builderValue.method] || 'text-slate-700'
                            }`}
                        >
                          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="https://api.segip.gob.bo/v1/verificar"
                        value={builderValue.url}
                        onChange={(e) => setBuilderValue({ ...builderValue, url: e.target.value })}
                        className="flex-1 px-3 py-2.5 bg-transparent font-mono text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Group & interval */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Grupo / Categoría</label>
                      <select
                        value={formData.groupId}
                        onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      >
                        <option value="">Sin grupo</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Intervalo de Chequeo (seg)</label>
                      <input
                        type="number"
                        min={10}
                        max={86400}
                        value={formData.interval}
                        onChange={(e) => setFormData({ ...formData, interval: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Umbral Lentitud (ms)</label>
                      <input
                        type="number"
                        min={100}
                        value={formData.slowThresholdMs}
                        onChange={(e) => setFormData({ ...formData, slowThresholdMs: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      />
                    </div>
                  </div>

                  {/* LOGIN_CHECK specific fields */}
                  {formData.type === 'LOGIN_CHECK' && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs">
                      <p className="font-bold text-[#245b87] text-[11px] uppercase tracking-wider">Validación Lógica de Login</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-700 mb-1">Campo de Éxito (JSON field)</label>
                          <input type="text" placeholder="token o accessToken"
                            value={formData.loginSuccessField}
                            onChange={(e) => setFormData({ ...formData, loginSuccessField: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg text-[11px] focus:outline-none focus:border-[#245b87]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-700 mb-1">Keyword de Fallo en Body</label>
                          <input type="text" placeholder="invalid_credentials"
                            value={formData.loginFailureKeyword}
                            onChange={(e) => setFormData({ ...formData, loginFailureKeyword: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg text-[11px] focus:outline-none focus:border-[#245b87]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Postman Builder Tabs */}
                  <PostmanRequestBuilder
                    value={builderValue}
                    onChange={setBuilderValue}
                    showUrlMethodBar={false}
                  />

                  {/* Notification Checkboxes */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-6">
                    <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={formData.notifyTelegram}
                        onChange={(e) => setFormData({ ...formData, notifyTelegram: e.target.checked })}
                        className="rounded border-slate-300 text-[#245b87] focus:ring-[#245b87]"
                      />
                      <span>Notificar por Telegram</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={formData.notifyEmail}
                        onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                        className="rounded border-slate-300 text-[#245b87] focus:ring-[#245b87]"
                      />
                      <span>Notificar por Correo</span>
                    </label>
                  </div>
                </div>
              )}

              {/* ─── CLASSIC FORM (for all other types) ─── */}
              {formData.type !== 'API_JSON' && formData.type !== 'LOGIN_CHECK' && (
                <>
                  {/* URL or Host */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87] font-mono text-xs"
                    />
                  </div>

                  {/* Group selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Grupo / Categoría</label>
                      <select
                        value={formData.groupId}
                        onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      >
                        <option value="">Sin grupo</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Intervalo de Chequeo (seg)</label>
                      <input type="number" min={10} max={86400} value={formData.interval}
                        onChange={(e) => setFormData({ ...formData, interval: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87]"
                      />
                    </div>
                  </div>

                  {/* SPECIFIC CONFIG FOR SOAP */}
                  {formData.type === 'SOAP_OPERACION' && (
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                      <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Configuración SOAP Envelope</h3>
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">SOAPAction Header (Opcional)</label>
                        <input type="text" placeholder='ej: "http://tempuri.org/ConsultarDatos"'
                          value={formData.soapAction}
                          onChange={(e) => setFormData({ ...formData, soapAction: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">XML Request Envelope</label>
                        <textarea rows={3} placeholder="<soapenv:Envelope xmlns:...>...</soapenv:Envelope>"
                          value={formData.soapEnvelope}
                          onChange={(e) => setFormData({ ...formData, soapEnvelope: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Keyword validation */}
                  {(formData.type === 'WEB_INSTITUCIONAL' || formData.type === 'SISTEMA_WEB') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Palabra Clave Esperada (Éxito)</label>
                        <input type="text" placeholder="ej: SEGIP o Bienvenido"
                          value={formData.expectedKeyword}
                          onChange={(e) => setFormData({ ...formData, expectedKeyword: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Palabra Inesperada (Marca Degradado)</label>
                        <input type="text" placeholder="ej: Database error o 500"
                          value={formData.unexpectedKeyword}
                          onChange={(e) => setFormData({ ...formData, unexpectedKeyword: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Notification Checkboxes */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-6">
                    <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={formData.notifyTelegram}
                        onChange={(e) => setFormData({ ...formData, notifyTelegram: e.target.checked })}
                        className="rounded border-slate-300 text-[#245b87] focus:ring-[#245b87]"
                      />
                      <span>Notificar por Telegram</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={formData.notifyEmail}
                        onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                        className="rounded border-slate-300 text-[#245b87] focus:ring-[#245b87]"
                      />
                      <span>Notificar por Correo</span>
                    </label>
                  </div>
                </>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#245b87] hover:bg-[#1b496d] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#245b87]/20 transition-all active:scale-[0.99]"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#245b87] to-[#B73852]" />

            <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-1">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-[#245b87] border border-rose-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Diagnóstico de Incidente con IA</h3>
                  <p className="text-xs text-slate-500">Asistente Ollama Local</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[160px] flex items-center justify-center">
              {aiLoading ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-3 border-[#245b87] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[#245b87] font-medium animate-pulse">
                    Analizando logs y respuesta técnica del servidor...
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {aiAnalysis}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 bg-[#245b87] hover:bg-[#1b496d] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#245b87]/20"
              >
                Cerrar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Footer */}
      <footer className="mt-8 py-4 border-t border-slate-200 text-center text-xs text-slate-500 bg-white/50">
        <div className="max-w-3xl mx-auto mb-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Servicios Monitoreados</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{services.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Uptime Global 24h</p>
            <p className="mt-1 text-sm font-bold text-[#245b87]">{stats?.globalUptime || '100.00'}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Latencia Promedio</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{stats?.avgResponseTime || 0} ms</p>
          </div>
        </div>
        <p className="font-semibold text-slate-700">
          Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas - SEGIP
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Servicio General de Identificación Personal &bull; SEGIP &copy; {new Date().getFullYear()}
        </p>
      </footer>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: SERVICE METRICS & ANALYTICS (GOOGLE CLOUD STYLE) */}
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
