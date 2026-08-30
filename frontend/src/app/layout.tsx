import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEGIP Monitor — Sistema de Monitoreo de Servicios',
  description: 'Monitoreo de alta disponibilidad para páginas web, APIs REST, servicios SOAP e infraestructura del SEGIP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#0a0f1d] text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
