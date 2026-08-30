'use client';

import React from 'react';

interface SegipLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  variant?: 'light' | 'dark' | 'color';
}

export const SegipLogo: React.FC<SegipLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  variant = 'color',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const subtitleSizes = {
    sm: 'text-[8px]',
    md: 'text-[9px]',
    lg: 'text-[11px]',
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* SEGIP Institutional Emblem SVG */}
      <div
        className={`${iconSizes[size]} flex-shrink-0 rounded-xl bg-[#790026] flex items-center justify-center shadow-md shadow-[#790026]/20 relative overflow-hidden`}
      >
        {/* Subtle Bolivian Flag Indicator Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] flex">
          <div className="flex-1 bg-[#d32f2f]" />
          <div className="flex-1 bg-[#fbc02d]" />
          <div className="flex-1 bg-[#2e7d32]" />
        </div>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[60%] h-[60%] text-white"
        >
          {/* Shield / Identity Biometric Symbol */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.15)" />
          <path d="M9 12l2 2 4-4" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center space-x-1.5 leading-none">
          <span className={`font-extrabold tracking-tight text-[#790026] font-sans ${titleSizes[size]}`}>
            SEGIP
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#790026]/10 text-[#790026] uppercase tracking-wider">
            MONITOR
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`font-semibold uppercase tracking-wider text-slate-500 mt-0.5 leading-none ${subtitleSizes[size]}`}
          >
            Servicio General de Identificación Personal
          </span>
        )}
      </div>
    </div>
  );
};

export default SegipLogo;
