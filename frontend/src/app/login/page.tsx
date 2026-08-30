'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, AlertCircle, Monitor, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import Image from 'next/image';

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
    <div className="min-h-screen bg-[#141A21] flex flex-col justify-between items-center relative overflow-hidden font-sans">
      {/* Top Background Floating Accent Card (matching LayoutUser in plataforma-tramites) */}
      <div className="w-full flex justify-center pt-6 px-4 absolute top-0 left-0 right-0 pointer-events-none">
        <div className="w-[94vw] max-w-6xl h-44 rounded-3xl bg-[#1C252E]/90 border border-white/5 opacity-60 blur-[1px]" />
      </div>

      {/* Institutional Top Header */}
      <header className="w-full max-w-6xl px-6 py-5 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#790026] flex items-center justify-center shadow-md shadow-[#790026]/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-[#B73852] font-semibold block">
              Estado Plurinacional de Bolivia
            </span>
            <span className="text-sm font-bold text-white tracking-wide">
              SEGIP &bull; Monitor de Servicios
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/tv')}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#FAFAFA] bg-[#1C252E] hover:bg-[#28323D] border border-white/10 transition-all shadow-sm"
        >
          <Monitor className="w-3.5 h-3.5 text-[#38B79D]" />
          <span>Modo Sala NOC</span>
        </button>
      </header>

      {/* Main Login Center Card */}
      <div className="w-full max-w-md px-4 py-8 z-10">
        <div className="bg-[#1C252E] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Top Accent Border in Granate/Secondary */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#790026] via-[#B73852] to-[#38B79D]" />

          {/* Title Header */}
          <div className="text-center mb-6 pt-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Inicio de Sesión
            </h1>
            <p className="text-[#9FA6AD] text-sm mt-1 font-normal">
              Ingresa tus credenciales para acceder al panel
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#BA1B1B]/15 border border-[#BA1B1B]/40 flex items-start space-x-3 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#FAFAFA] mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9FA6AD]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141A21] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852] transition-all text-sm"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#FAFAFA] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9FA6AD]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141A21] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#B73852] focus:ring-1 focus:ring-[#B73852] transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#790026] hover:bg-[#9c1b3e] text-white font-semibold rounded-xl shadow-lg shadow-[#790026]/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-sm active:scale-[0.99]"
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
          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-[#9FA6AD]">Pantalla pública para NOC:</span>
            <button
              type="button"
              onClick={() => router.push('/tv')}
              className="inline-flex items-center font-semibold text-[#38B79D] hover:text-[#4edec1] transition-colors"
            >
              <Monitor className="w-3.5 h-3.5 mr-1" />
              Ver Modo TV
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Footer */}
      <footer className="w-full max-w-6xl px-6 py-6 text-center text-xs text-[#9FA6AD] z-10 border-t border-white/5">
        <p>
          Servicio General de Identificación Personal &bull; SEGIP &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
