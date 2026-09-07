'use client';

import React from 'react';

interface SegipLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  showArea?: boolean;
}

export const SegipLogo: React.FC<SegipLogoProps> = ({
  className = '',
  size = 'md',
  showBadge = true,
  showArea = true,
}) => {
  const heightClasses = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16',
  };

  const badgeSizes = {
    sm: 'text-[9px] px-1.5 py-0.2',
    md: 'text-[10px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-0.5',
    xl: 'text-xs px-3 py-1',
  };

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Official SEGIP Imagotipo */}
      <img
        src="/segip-logo.png"
        alt="SEGIP - Servicio General de Identificación Personal"
        className={`${heightClasses[size]} w-auto object-contain drop-shadow-sm`}
      />

      {/* Institutional System Badge and Area Title */}
      {(showBadge || showArea) && (
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center space-x-1.5">
            {/*             {showBadge && (
              <span
                className={`font-extrabold tracking-wider bg-[#245b87] text-white rounded-md uppercase shadow-sm shadow-[#245b87]/20 border border-[#245b87]/30 ${badgeSizes[size]}`}
              >
                MONITOR
              </span>
            )} */}
          </div>
          {showArea && (
            <span className="hidden xl:inline text-[9px] font-semibold text-slate-500 uppercase tracking-tight mt-0.5 truncate max-w-[340px]">
              Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SegipLogo;
