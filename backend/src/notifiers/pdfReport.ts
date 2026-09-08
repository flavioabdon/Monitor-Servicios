import PDFDocument from 'pdfkit';
import { Service, Check } from '@prisma/client';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';

const reportIntervals: Record<string, number> = {
  '1h': 1,
  '6h': 6,
  '12h': 12,
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

type ServiceWithChecks = Service & { checks: Check[] };

interface ServiceStat {
  service: Service;
  checks: Check[];
  uptime: string;
  degradedChecks: Check[];
  downChecks: Check[];
  avgLatency: number;
  lastStatus: string;
}

export async function generateReportPDF(interval = '24h'): Promise<{ buffer: Buffer; filename: string }> {
  const hours = reportIntervals[interval] || reportIntervals['24h'];
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);

  const services = (await prisma.service.findMany({
    orderBy: { name: 'asc' },
    include: {
      checks: {
        where: { timestamp: { gte: from, lte: to } },
        orderBy: { timestamp: 'asc' },
      },
    },
  })) as ServiceWithChecks[];

  return new Promise<{ buffer: Buffer; filename: string }>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 36, bottom: 45, left: 36, right: 36 },
        autoFirstPage: true,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const filename = `Reporte-SEGIP-${interval}-${to.toISOString().slice(0, 10)}.pdf`;
        resolve({ buffer, filename });
      });
      doc.on('error', (err: any) => reject(err));

      const pageWidth = 612; // Letter width in pt
      const pageHeight = 792; // Letter height in pt
      const margin = 36;
      const contentWidth = pageWidth - margin * 2; // 540 pt

      // ─────────────────────────────────────────────────────────────
      // 1. HEADER BANNER INSTITUCIONAL
      // ─────────────────────────────────────────────────────────────
      doc.rect(margin, margin, contentWidth, 54).fill('#245b87');

      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
      doc.text('SERVICIO GENERAL DE IDENTIFICACIÓN PERSONAL — SEGIP', margin + 14, margin + 12);

      doc.fillColor('#cbd5e1').fontSize(9).font('Helvetica');
      doc.text(
        `MONITOREO INSTITUCIONAL DE DISPONIBILIDAD • REPORTE ÚLTIMAS ${interval.toUpperCase()}`,
        margin + 14,
        margin + 28
      );

      let curY = margin + 64;

      // Metadatos del reporte
      doc.rect(margin, curY, contentWidth, 34).fill('#f8fafc').stroke('#e2e8f0');
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
      doc.text(
        `Periodo analizado: ${from.toLocaleString('es-BO')} al ${to.toLocaleString('es-BO')}`,
        margin + 10,
        curY + 7
      );
      doc.text(
        `Fecha y hora de generación: ${to.toLocaleString('es-BO')} | Generado por: SEGIP Monitor Automático`,
        margin + 10,
        curY + 19
      );

      curY += 44;

      // ─────────────────────────────────────────────────────────────
      // 2. RESUMEN EJECUTIVO (KPIs)
      // ─────────────────────────────────────────────────────────────
      let totalServices = services.length;
      let totalUp = 0;
      let totalDegraded = 0;
      let totalDown = 0;
      let globalChecksCount = 0;
      let globalUpCount = 0;

      const serviceStats: ServiceStat[] = services.map((svc: ServiceWithChecks) => {
        const checks = svc.checks;
        const total = checks.length;
        const upCount = checks.filter((c: Check) => c.status === 'UP').length;
        const degradedChecks = checks.filter((c: Check) => c.status === 'DEGRADED');
        const downChecks = checks.filter((c: Check) => c.status === 'DOWN' || c.status === 'TIMEOUT');
        const uptime = total > 0 ? ((upCount / total) * 100).toFixed(1) : '100.0';

        const latencies = checks
          .map((c: Check) => c.responseTime ?? c.pingAvg ?? 0)
          .filter((v: number) => v > 0);
        const avgLatency =
          latencies.length > 0
            ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
            : 0;

        const lastStatus = checks[checks.length - 1]?.status || 'UNKNOWN';
        if (lastStatus === 'UP') totalUp++;
        else if (lastStatus === 'DEGRADED') totalDegraded++;
        else if (lastStatus === 'DOWN' || lastStatus === 'TIMEOUT') totalDown++;

        globalChecksCount += total;
        globalUpCount += upCount;

        return {
          service: svc,
          checks,
          uptime,
          degradedChecks,
          downChecks,
          avgLatency,
          lastStatus,
        };
      });

      const globalUptime =
        globalChecksCount > 0 ? ((globalUpCount / globalChecksCount) * 100).toFixed(1) : '100.0';

      const cardWidth = (contentWidth - 15) / 4;
      const kpis = [
        { label: 'TOTAL SERVICIOS', value: `${totalServices}`, color: '#245b87', sub: 'Monitoreados' },
        { label: 'OPERATIVOS (UP)', value: `${totalUp}`, color: '#16a34a', sub: 'Actualmente activos' },
        { label: 'RALENTIZADOS', value: `${totalDegraded}`, color: '#d97706', sub: 'Alertas lógicas' },
        { label: 'CAÍDOS (DOWN)', value: `${totalDown}`, color: '#dc2626', sub: `${globalUptime}% uptime global` },
      ];

      kpis.forEach((kpi, idx) => {
        const kX = margin + idx * (cardWidth + 5);
        doc.rect(kX, curY, cardWidth, 42).fill('#ffffff').stroke('#cbd5e1');
        doc.rect(kX, curY, cardWidth, 3).fill(kpi.color);

        doc.fillColor(kpi.color).fontSize(14).font('Helvetica-Bold');
        doc.text(kpi.value, kX + 8, curY + 9);

        doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold');
        doc.text(kpi.label, kX + 8, curY + 26);

        doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica');
        doc.text(kpi.sub, kX + 8, curY + 34);
      });

      curY += 52;

      // ─────────────────────────────────────────────────────────────
      // 3. TABLA DETALLADA DE SERVICIOS
      // ─────────────────────────────────────────────────────────────
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
      doc.text('DETALLE DE DISPONIBILIDAD POR SERVICIO', margin, curY);
      curY += 15;

      const colW = {
        name: 180,
        uptime: 65,
        latency: 55,
        degraded: 65,
        down: 55,
        status: 120,
      };

      // Header de tabla
      doc.rect(margin, curY, contentWidth, 18).fill('#245b87');
      doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');

      let colX = margin + 6;
      doc.text('SERVICIO', colX, curY + 5);
      colX += colW.name;
      doc.text('DISPONIBILIDAD', colX, curY + 5);
      colX += colW.uptime;
      doc.text('LATENCIA', colX, curY + 5);
      colX += colW.latency;
      doc.text('RALENTIZADO', colX, curY + 5);
      colX += colW.degraded;
      doc.text('CAÍDAS', colX, curY + 5);
      colX += colW.down;
      doc.text('ESTADO ACTUAL', colX, curY + 5);

      curY += 18;

      serviceStats.forEach((stat: ServiceStat, idx: number) => {
        // Paginación si nos acercamos al final
        if (curY + 18 > pageHeight - 55) {
          doc.addPage();
          curY = margin;
          // Re-dibujar header de tabla en nueva página
          doc.rect(margin, curY, contentWidth, 18).fill('#245b87');
          doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
          let rx = margin + 6;
          doc.text('SERVICIO', rx, curY + 5);
          rx += colW.name;
          doc.text('DISPONIBILIDAD', rx, curY + 5);
          rx += colW.uptime;
          doc.text('LATENCIA', rx, curY + 5);
          rx += colW.latency;
          doc.text('RALENTIZADO', rx, curY + 5);
          rx += colW.degraded;
          doc.text('CAÍDAS', rx, curY + 5);
          rx += colW.down;
          doc.text('ESTADO ACTUAL', rx, curY + 5);
          curY += 18;
        }

        const isEven = idx % 2 === 0;
        doc.rect(margin, curY, contentWidth, 18).fill(isEven ? '#ffffff' : '#f8fafc').stroke('#f1f5f9');

        let rowX = margin + 6;

        // Nombre del servicio
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold');
        const svcTitle = stat.service.name.length > 34 ? stat.service.name.slice(0, 32) + '…' : stat.service.name;
        doc.text(svcTitle, rowX, curY + 5);
        rowX += colW.name;

        // Disponibilidad %
        const uptimeNum = parseFloat(stat.uptime);
        doc
          .fillColor(uptimeNum >= 99 ? '#16a34a' : uptimeNum >= 95 ? '#d97706' : '#dc2626')
          .fontSize(7.5)
          .font('Helvetica-Bold');
        doc.text(`${stat.uptime}%`, rowX, curY + 5);
        rowX += colW.uptime;

        // Latencia promedio
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        doc.text(stat.avgLatency > 0 ? `${stat.avgLatency} ms` : '--', rowX, curY + 5);
        rowX += colW.latency;

        // Conteo ralentizados
        doc.fillColor(stat.degradedChecks.length > 0 ? '#d97706' : '#64748b').fontSize(7.5).font('Helvetica');
        doc.text(`${stat.degradedChecks.length}`, rowX, curY + 5);
        rowX += colW.degraded;

        // Conteo caídas
        doc.fillColor(stat.downChecks.length > 0 ? '#dc2626' : '#64748b').fontSize(7.5).font('Helvetica');
        doc.text(`${stat.downChecks.length}`, rowX, curY + 5);
        rowX += colW.down;

        // Estado actual (texto normal sin subrayado ni recuadros)
        let statusLabel = 'Operativo (UP)';
        if (stat.lastStatus === 'DEGRADED') {
          statusLabel = 'Ralentizado';
        } else if (stat.lastStatus === 'DOWN' || stat.lastStatus === 'TIMEOUT') {
          statusLabel = 'Caído (DOWN)';
        } else if (stat.lastStatus === 'UNKNOWN') {
          statusLabel = 'Sin datos';
        }

        doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
        doc.text(statusLabel, rowX, curY + 5);

        curY += 18;
      });

      // ─────────────────────────────────────────────────────────────
      // 4. ANEXOS DETALLADOS DE CAÍDAS Y RALENTIZACIONES
      // ─────────────────────────────────────────────────────────────
      const renderIncidentSection = (
        title: string,
        incidents: Array<{ service: Service; check: Check }>,
        color: string,
        background: string
      ) => {
        if (incidents.length === 0) return;

        doc.addPage();
        curY = margin;
        doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
        doc.text(title, margin, curY);
        curY += 18;

        const headers = ['SERVICIO', 'FECHA Y HORA', 'ESTADO', 'LATENCIA', 'HTTP', 'DETALLE'];
        const widths = [145, 105, 58, 58, 42, 132];
        const drawHeader = () => {
          doc.rect(margin, curY, contentWidth, 18).fill('#245b87');
          let headerX = margin + 5;
          doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
          headers.forEach((header, index) => {
            doc.text(header, headerX, curY + 5, { width: widths[index] });
            headerX += widths[index];
          });
          curY += 18;
        };

        drawHeader();
        incidents.forEach(({ service, check }, index) => {
          const detail = check.error || check.bodySnippet || 'Sin detalle adicional';
          const detailText = detail.replace(/\s+/g, ' ').slice(0, 90);
          const rowHeight = 26;
          if (curY + rowHeight > pageHeight - 55) {
            doc.addPage();
            curY = margin;
            drawHeader();
          }

          doc.rect(margin, curY, contentWidth, rowHeight)
            .fill(index % 2 === 0 ? background : '#ffffff')
            .stroke('#e2e8f0');
          const values = [
            service.name.slice(0, 24),
            new Date(check.timestamp).toLocaleString('es-BO'),
            check.status,
            check.responseTime || check.pingAvg ? `${Math.round(check.responseTime || check.pingAvg || 0)} ms` : '--',
            check.httpCode ? `${check.httpCode}` : '--',
            detailText,
          ];
          let rowX = margin + 5;
          values.forEach((value, valueIndex) => {
            doc.fillColor(valueIndex === 2 ? color : '#334155')
              .fontSize(6.8)
              .font(valueIndex === 2 ? 'Helvetica-Bold' : 'Helvetica');
            doc.text(value, rowX, curY + 9, { width: widths[valueIndex], ellipsis: true });
            rowX += widths[valueIndex];
          });
          curY += rowHeight;
        });
      };

      const downIncidents = serviceStats.flatMap((stat) =>
        stat.downChecks.map((check) => ({ service: stat.service, check }))
      );
      const degradedIncidents = serviceStats.flatMap((stat) =>
        stat.degradedChecks.map((check) => ({ service: stat.service, check }))
      );

      renderIncidentSection('REPORTE DETALLADO DE CAÍDAS', downIncidents, '#b91c1c', '#fef2f2');
      renderIncidentSection('REPORTE DETALLADO DE SERVICIOS RALENTIZADOS', degradedIncidents, '#b45309', '#fffbeb');

      // ─────────────────────────────────────────────────────────────
      // 5. FOOTER INSTITUCIONAL EN TODAS LAS PÁGINAS
      // ─────────────────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Línea divisoria
        doc.strokeColor('#e2e8f0').lineWidth(0.8);
        doc.moveTo(margin, pageHeight - 38).lineTo(pageWidth - margin, pageHeight - 38).stroke();

        doc.fillColor('#64748b').fontSize(7).font('Helvetica');
        doc.text(
          'Unidad Nacional de Explotación e Implementación de Aplicaciones Informáticas — SEGIP',
          margin,
          pageHeight - 30
        );

        doc.fillColor('#94a3b8').fontSize(7).font('Helvetica');
        doc.text(
          `Página ${i + 1} de ${range.count}`,
          pageWidth - margin - 80,
          pageHeight - 30,
          { width: 80, align: 'right' }
        );
      }

      doc.end();
    } catch (err) {
      logger.error('Error generating PDF report:', err);
      reject(err);
    }
  });
}
