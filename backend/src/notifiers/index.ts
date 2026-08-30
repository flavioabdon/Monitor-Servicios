import TelegramBot from 'node-telegram-bot-api';
import nodemailer from 'nodemailer';
import { Service, Alert } from '@prisma/client';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { ProbeResult } from '../probes/httpProbe';

// ── Telegram ─────────────────────────────────────────────────────────────────

let telegramBot: TelegramBot | null = null;

function getBot(): TelegramBot | null {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  if (!telegramBot) {
    telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
  }
  return telegramBot;
}

async function sendTelegram(message: string): Promise<void> {
  const bot = getBot();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chatId) {
    logger.warn('Telegram not configured — skipping notification');
    return;
  }
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    logger.info('Telegram notification sent');
  } catch (err) {
    logger.error('Failed to send Telegram notification:', err);
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn('Email not configured — skipping notification');
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'SEGIP Monitor',
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}`);
  } catch (err) {
    logger.error('Failed to send email:', err);
  }
}

// ── Alert notifications ───────────────────────────────────────────────────────

export async function sendAlert(
  service: Service,
  alert: Alert,
  result: ProbeResult
): Promise<void> {
  const statusEmoji = alert.type === 'DEGRADED' ? '🟡' : '🔴';
  const statusText = alert.type === 'DEGRADED' ? 'DEGRADADO' : 'CAÍDO';

  // Telegram message
  const telegramMsg = [
    `${statusEmoji} <b>[ALERTA] ${service.name}</b>`,
    `Estado: <b>${statusText}</b>`,
    result.httpCode ? `HTTP: ${result.httpCode}` : '',
    result.responseTime ? `Tiempo: ${result.responseTime}ms` : '',
    result.error ? `Error: <code>${result.error.slice(0, 200)}</code>` : '',
    `\n🕐 ${new Date().toLocaleString('es-BO')}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (service.notifyTelegram) {
    await sendTelegram(telegramMsg);
    await prisma.alert.update({ where: { id: alert.id }, data: { notifiedTelegram: true } });
  }

  // Email message
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${alert.type === 'DEGRADED' ? '#f59e0b' : '#ef4444'};padding:20px;border-radius:8px 8px 0 0">
        <h2 style="color:white;margin:0">${statusEmoji} ALERTA — ${service.name}</h2>
      </div>
      <div style="background:#f9fafb;padding:20px;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;font-weight:bold">Estado:</td><td>${statusText}</td></tr>
          ${result.httpCode ? `<tr><td style="padding:8px;font-weight:bold">HTTP Code:</td><td>${result.httpCode}</td></tr>` : ''}
          ${result.responseTime ? `<tr><td style="padding:8px;font-weight:bold">Tiempo de respuesta:</td><td>${result.responseTime}ms</td></tr>` : ''}
          <tr><td style="padding:8px;font-weight:bold">URL:</td><td><a href="${service.url}">${service.url}</a></td></tr>
          ${result.error ? `<tr><td style="padding:8px;font-weight:bold">Error:</td><td style="color:#ef4444;font-family:monospace">${result.error}</td></tr>` : ''}
          <tr><td style="padding:8px;font-weight:bold">Hora:</td><td>${new Date().toLocaleString('es-BO')}</td></tr>
        </table>
      </div>
      <p style="color:#6b7280;font-size:12px;text-align:center">SEGIP Monitor — Sistema de Monitoreo</p>
    </div>
  `;

  const emailRecipients = [
    process.env.ALERT_EMAIL_TO,
    service.notifyEmailTo,
  ]
    .filter(Boolean)
    .join(',');

  if (service.notifyEmail && emailRecipients) {
    await sendEmail(emailRecipients, `🔴 ALERTA: ${service.name} está ${statusText}`, emailHtml);
    await prisma.alert.update({ where: { id: alert.id }, data: { notifiedEmail: true } });
  }
}

export async function sendRecovery(service: Service, alert: Alert): Promise<void> {
  const duration = alert.resolvedAt
    ? Math.round((alert.resolvedAt.getTime() - alert.startedAt.getTime()) / 60000)
    : 0;

  const telegramMsg = [
    `🟢 <b>[RECUPERADO] ${service.name}</b>`,
    `El servicio está nuevamente en línea`,
    duration > 0 ? `Tiempo caído: <b>${duration} minutos</b>` : '',
    `\n🕐 ${new Date().toLocaleString('es-BO')}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (service.notifyTelegram) await sendTelegram(telegramMsg);

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#10b981;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="color:white;margin:0">🟢 RECUPERADO — ${service.name}</h2>
      </div>
      <div style="background:#f9fafb;padding:20px;border-radius:0 0 8px 8px">
        <p>El servicio <strong>${service.name}</strong> está nuevamente en línea.</p>
        ${duration > 0 ? `<p>Tiempo fuera de servicio: <strong>${duration} minutos</strong></p>` : ''}
        <p>Hora de recuperación: ${new Date().toLocaleString('es-BO')}</p>
      </div>
    </div>
  `;

  const emailRecipients = [process.env.ALERT_EMAIL_TO, service.notifyEmailTo].filter(Boolean).join(',');
  if (service.notifyEmail && emailRecipients) {
    await sendEmail(emailRecipients, `🟢 RECUPERADO: ${service.name}`, emailHtml);
  }
}

// ── Daily Report ──────────────────────────────────────────────────────────────

export async function sendDailyReport(): Promise<void> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const services = await prisma.service.findMany({ where: { enabled: true } });
  const alerts = await prisma.alert.findMany({
    where: { startedAt: { gte: yesterday } },
    include: { service: true },
    orderBy: { startedAt: 'desc' },
  });

  // Calculate uptime for each service
  const serviceStats = await Promise.all(
    services.map(async (svc) => {
      const checks = await prisma.check.findMany({
        where: { serviceId: svc.id, timestamp: { gte: yesterday } },
        select: { status: true, responseTime: true },
      });
      const total = checks.length;
      const up = checks.filter((c) => c.status === 'UP').length;
      const uptime = total > 0 ? ((up / total) * 100).toFixed(1) : 'N/A';
      const avgRt = checks.reduce((acc, c) => acc + (c.responseTime || 0), 0) / (total || 1);
      return { name: svc.name, uptime, avgResponseTime: Math.round(avgRt), total };
    })
  );

  const totalAlerts = alerts.length;
  const globalUptime =
    serviceStats.length > 0
      ? (serviceStats.reduce((acc, s) => acc + parseFloat(s.uptime || '0'), 0) / serviceStats.length).toFixed(1)
      : 'N/A';

  const telegramMsg = [
    `📊 <b>Reporte Diario — SEGIP Monitor</b>`,
    `📅 ${new Date().toLocaleDateString('es-BO')}`,
    ``,
    `🌐 Uptime global: <b>${globalUptime}%</b>`,
    `🚨 Incidentes: <b>${totalAlerts}</b>`,
    ``,
    `<b>Servicios con incidentes:</b>`,
    ...alerts.slice(0, 5).map(
      (a) => `  • ${a.service.name}: ${a.type} (${Math.round((a.resolvedAt ? a.resolvedAt.getTime() - a.startedAt.getTime() : Date.now() - a.startedAt.getTime()) / 60000)} min)`
    ),
  ]
    .join('\n');

  await sendTelegram(telegramMsg);

  const emailTo = process.env.ALERT_EMAIL_TO;
  if (emailTo) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
        <div style="background:#1e293b;padding:24px;border-radius:8px 8px 0 0">
          <h2 style="color:white;margin:0">📊 Reporte Diario — SEGIP Monitor</h2>
          <p style="color:#94a3b8;margin:8px 0 0">Últimas 24 horas</p>
        </div>
        <div style="background:#f8fafc;padding:24px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
            <div style="background:white;padding:16px;border-radius:8px;text-align:center;border:1px solid #e2e8f0">
              <div style="font-size:32px;font-weight:bold;color:#10b981">${globalUptime}%</div>
              <div style="color:#64748b">Uptime Global</div>
            </div>
            <div style="background:white;padding:16px;border-radius:8px;text-align:center;border:1px solid #e2e8f0">
              <div style="font-size:32px;font-weight:bold;color:${totalAlerts > 0 ? '#ef4444' : '#10b981'}">${totalAlerts}</div>
              <div style="color:#64748b">Incidentes</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#1e293b;color:white">
                <th style="padding:12px;text-align:left">Servicio</th>
                <th style="padding:12px;text-align:center">Uptime</th>
                <th style="padding:12px;text-align:center">T. Respuesta Avg</th>
                <th style="padding:12px;text-align:center">Checks</th>
              </tr>
            </thead>
            <tbody>
              ${serviceStats.map((s, i) => `
                <tr style="background:${i % 2 === 0 ? 'white' : '#f8fafc'}">
                  <td style="padding:10px">${s.name}</td>
                  <td style="padding:10px;text-align:center;color:${parseFloat(s.uptime) >= 99 ? '#10b981' : parseFloat(s.uptime) >= 95 ? '#f59e0b' : '#ef4444'};font-weight:bold">${s.uptime}%</td>
                  <td style="padding:10px;text-align:center">${s.avgResponseTime}ms</td>
                  <td style="padding:10px;text-align:center">${s.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:12px;padding:16px">SEGIP Monitor — Generado automáticamente</p>
      </div>
    `;
    await sendEmail(emailTo, `📊 Reporte Diario SEGIP Monitor — ${new Date().toLocaleDateString('es-BO')}`, html);
  }
}

export { sendTelegram, sendEmail };
