import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEGIP Monitor — Plataforma de Monitoreo de Servicios del Estado',
  description: 'Monitoreo de alta disponibilidad para páginas web, APIs REST, servicios SOAP e infraestructura del SEGIP',
  icons: {
    icon: '/logos/logo-segip.svg',
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
