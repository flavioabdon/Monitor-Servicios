import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEGIP Monitor — Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas - SEGIP',
  description: 'Sistema de Monitoreo de Alta Disponibilidad — Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas - SEGIP',
  icons: {
    icon: '/segip-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="light">
      <body className="bg-[#f1f5f9] text-[#1e293b] min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
