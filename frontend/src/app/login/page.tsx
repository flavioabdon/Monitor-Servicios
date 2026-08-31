'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, Monitor, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import SegipLogo from '@/components/SegipLogo';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const res = await axios.post(`${backendUrl}/api/auth/login`, { username, password });

      localStorage.setItem('segip_token', res.data.token);
      localStorage.setItem('segip_user', res.data.username);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciales inválidas o servidor no disponible');
    } finally {
      setLoading(false);
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
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#790026] via-[#B73852] to-[#16a34a]" />

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
            {/*             <div className="inline-flex items-center space-x-1.5 bg-[#790026]/10 border border-[#790026]/20 px-3 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
              <span className="text-[10px] font-bold tracking-wider text-[#790026] uppercase">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#790026] focus:ring-1 focus:ring-[#790026] transition-all text-sm"
                  placeholder="admin"
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#790026] focus:ring-1 focus:ring-[#790026] transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#790026] hover:bg-[#9c1b3e] text-white font-semibold rounded-xl shadow-md shadow-[#790026]/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-sm active:scale-[0.99]"
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
              className="inline-flex items-center font-semibold text-[#790026] hover:text-[#9c1b3e] transition-colors"
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
    </div>
  );
}
