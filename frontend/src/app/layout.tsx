import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEGIP Monitor — Plataforma de Monitoreo de Servicios del Estado',
  description: 'Monitoreo de alta disponibilidad para páginas web, APIs REST, servicios SOAP e infraestructura del SEGIP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#141A21] text-[#FAFAFA] min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
