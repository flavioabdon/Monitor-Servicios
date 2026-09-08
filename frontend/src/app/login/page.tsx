'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, Monitor, ArrowRight } from 'lucide-react';
import axios from 'axios';
import SegipLogo from '@/components/SegipLogo';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localUsername, setLocalUsername] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [showLocalLogin, setShowLocalLogin] = useState(false);
  const [error, setError] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const router = useRouter();

  const authenticate = async (type: 'local' | 'institutional') => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      return axios.post(`${backendUrl}/api/auth/login`, { username, password, authType: type });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      try {
        res = await authenticate('institutional');
      } catch (err: any) {
        const institutionalUnavailable = err.response?.status === 503
          && err.response?.data?.code === 'INSTITUTIONAL_AUTH_UNAVAILABLE';

        if (!institutionalUnavailable) throw err;

        setLocalError('');
        setShowLocalLogin(true);
        return;
      }

      localStorage.setItem('segip_token', res.data.token);
      localStorage.setItem('segip_user', res.data.username);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciales inválidas o servidor no disponible');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setLocalLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const res = await axios.post(`${backendUrl}/api/auth/login`, {
        username: localUsername,
        password: localPassword,
        authType: 'local',
      });

      localStorage.setItem('segip_token', res.data.token);
      localStorage.setItem('segip_user', res.data.username);
      router.push('/dashboard');
    } catch (err: any) {
      setLocalError(err.response?.data?.error || 'Credenciales locales inválidas');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col justify-between items-center relative overflow-hidden font-sans">
      {/* Top Background Floating Accent Card (matching LayoutUser in plataforma-tramites) */}
      <div className="w-full flex justify-center pt-6 px-4 absolute top-0 left-0 right-0 pointer-events-none">
      </div>

      {/* Institutional Top Header */}
      <header className="w-full max-w-6xl px-6 py-5 flex items-center justify-between z-10">
        <SegipLogo size="md" />

        {/*         <button
          type="button"
          onClick={() => router.push('/tv')}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-sm"
        >
          <Monitor className="w-3.5 h-3.5 text-[#16a34a]" />
          <span>Modo Sala NOC</span>
        </button> */}
      </header>

      {/* Main Login Center Card */}
      <div className="w-full max-w-md px-4 py-8 z-10">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          {/* Subtle Top Accent Border in Granate/Secondary */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#245b87] via-[#b8c6d3] to-[#5c8fb8]" />

          {/* Logo inside Login Form */}
          <div className="flex flex-col items-center justify-center mb-5 pt-2">
            <img
              src="/segip-logo.png"
              alt="SEGIP - Servicio General de Identificación Personal"
              className="h-12 sm:h-14 w-auto object-contain drop-shadow-sm mb-2"
            />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight text-center max-w-[320px] leading-tight mb-2">
              Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas - SEGIP
            </span>
            {/*             <div className="inline-flex items-center space-x-1.5 bg-[#245b87]/10 border border-[#245b87]/20 px-3 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
              <span className="text-[10px] font-bold tracking-wider text-[#245b87] uppercase">
                SISTEMA DE MONITOREO & NOC
              </span>
            </div> */}
          </div>

          {/* Title Header */}
          <div className="text-center mb-6">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Inicio De Sesión
            </h1>
            {/*             <p className="text-slate-500 text-xs mt-1 font-normal">
              Ingrese sus credenciales para acceder al panel de control
            </p> */}
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87] transition-all text-sm"
                  placeholder="u.común"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87] transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#245b87] hover:bg-[#1b496d] text-white font-semibold rounded-xl shadow-md shadow-[#245b87]/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-sm active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick TV Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            {/*             <span className="text-slate-500">Pantalla pública de Monitoreo:</span> */}
            <button
              type="button"
              onClick={() => router.push('/tv')}
              className="inline-flex items-center font-semibold text-[#245b87] hover:text-[#1b496d] transition-colors"
            >
              <Monitor className="w-3.5 h-3.5 mr-1 text-[#16a34a]" />
              Pantalla Monitoreo
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Footer */}
      <footer className="w-full max-w-6xl px-6 py-6 text-center text-xs text-slate-500 z-10 border-t border-slate-200">
        <p className="font-semibold text-slate-700">
          Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas - SEGIP
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Servicio General de Identificación Personal &bull; SEGIP &copy; {new Date().getFullYear()}
        </p>
      </footer>

      {showLocalLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="mb-5 flex items-start space-x-3">
              <div className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Servidor institucional desconectado</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Puede continuar utilizando un usuario local para ingresar al monitor.
                </p>
              </div>
            </div>

            {localError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {localError}
              </div>
            )}

            <form onSubmit={handleLocalLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Usuario local</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={localUsername}
                    onChange={(e) => setLocalUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-[#245b87] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#245b87]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Contraseña</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={localPassword}
                    onChange={(e) => setLocalPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-[#245b87] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#245b87]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLocalLogin(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={localLoading}
                  className="flex items-center justify-center space-x-2 rounded-xl bg-[#245b87] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#245b87]/20 transition-all hover:bg-[#1b496d] disabled:opacity-50"
                >
                  {localLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  <span>Iniciar con usuario local</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
