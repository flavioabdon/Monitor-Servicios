import TelegramBot = require('node-telegram-bot-api');
import nodemailer from 'nodemailer';
import { Service, Alert } from '@prisma/client';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { ProbeResult } from '../probes/httpProbe';

// ── Configuration State ───────────────────────────────────────────────────────

export interface NotificationConfigData {
  telegramEnabled: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;

  emailEnabled: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  alertEmailTo?: string;

  // Interruptor global de reportes (los horarios individuales viven en ReportSchedule)
  reportEnabled: boolean;
}

let cachedConfig: NotificationConfigData | null = null;
let telegramBot: TelegramBot | null = null;
let lastBotToken: string | null = null;

export async function getNotificationConfig(): Promise<NotificationConfigData> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    if (config) {
      cachedConfig = {
        telegramEnabled: config.telegramEnabled,
        telegramBotToken: config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
        telegramChatId: config.telegramChatId || process.env.TELEGRAM_CHAT_ID || '',
        emailEnabled: config.emailEnabled,
        smtpHost: config.smtpHost || process.env.SMTP_HOST || '',
        smtpPort: config.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587),
        smtpSecure: config.smtpSecure ?? (process.env.SMTP_SECURE === 'true'),
        smtpUser: config.smtpUser || process.env.SMTP_USER || '',
        smtpPass: config.smtpPass || process.env.SMTP_PASS || '',
        smtpFrom: config.smtpFrom || process.env.SMTP_FROM || 'SEGIP Monitor <notificaciones@segip.gob.bo>',
        alertEmailTo: config.alertEmailTo || process.env.ALERT_EMAIL_TO || '',
        reportEnabled: config.reportEnabled,
      };
      return cachedConfig;
    }
  } catch (err) {
    logger.warn('Failed to load system config from DB, falling back to process.env');
  }

  // Fallback to process.env
  cachedConfig = {
    telegramEnabled: !!process.env.TELEGRAM_BOT_TOKEN,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    emailEnabled: !!process.env.SMTP_HOST,
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || 'SEGIP Monitor <notificaciones@segip.gob.bo>',
    alertEmailTo: process.env.ALERT_EMAIL_TO || '',
    reportEnabled: false,
  };
  return cachedConfig;
}

export async function saveNotificationConfig(data: Partial<NotificationConfigData>): Promise<NotificationConfigData> {
  const current = await getNotificationConfig();
  
  const updated = await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: {
      telegramEnabled: data.telegramEnabled ?? current.telegramEnabled,
      telegramBotToken: data.telegramBotToken !== undefined ? data.telegramBotToken : current.telegramBotToken,
      telegramChatId: data.telegramChatId !== undefined ? data.telegramChatId : current.telegramChatId,
      emailEnabled: data.emailEnabled ?? current.emailEnabled,
      smtpHost: data.smtpHost !== undefined ? data.smtpHost : current.smtpHost,
      smtpPort: data.smtpPort !== undefined ? Number(data.smtpPort) : current.smtpPort,
      smtpSecure: data.smtpSecure !== undefined ? Boolean(data.smtpSecure) : current.smtpSecure,
      smtpUser: data.smtpUser !== undefined ? data.smtpUser : current.smtpUser,
      smtpPass: data.smtpPass !== undefined && data.smtpPass !== '••••••••' ? data.smtpPass : current.smtpPass,
      smtpFrom: data.smtpFrom !== undefined ? data.smtpFrom : current.smtpFrom,
      alertEmailTo: data.alertEmailTo !== undefined ? data.alertEmailTo : current.alertEmailTo,
      reportEnabled: data.reportEnabled ?? current.reportEnabled,
    },
    create: {
      id: 'default',
      telegramEnabled: data.telegramEnabled ?? false,
      telegramBotToken: data.telegramBotToken || '',
      telegramChatId: data.telegramChatId || '',
      emailEnabled: data.emailEnabled ?? false,
      smtpHost: data.smtpHost || '',
      smtpPort: data.smtpPort ? Number(data.smtpPort) : 587,
      smtpSecure: Boolean(data.smtpSecure),
      smtpUser: data.smtpUser || '',
      smtpPass: data.smtpPass && data.smtpPass !== '••••••••' ? data.smtpPass : '',
      smtpFrom: data.smtpFrom || 'SEGIP Monitor <notificaciones@segip.gob.bo>',
      alertEmailTo: data.alertEmailTo || '',
      reportEnabled: data.reportEnabled ?? false,
    },
  });

  // Reset bot cache so token change takes effect
  telegramBot = null;
  lastBotToken = null;

  return getNotificationConfig();
}

// ── Telegram Helpers ─────────────────────────────────────────────────────────

function getBot(token?: string): TelegramBot | null {
  const activeToken = token || cachedConfig?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!activeToken) return null;
  
  if (!telegramBot || lastBotToken !== activeToken) {
    telegramBot = new TelegramBot(activeToken, { polling: false });
    lastBotToken = activeToken;
  }
  return telegramBot;
}

export async function sendTelegram(message: string, overrideChatId?: string, overrideToken?: string): Promise<void> {
  const config = await getNotificationConfig();
  const token = overrideToken || config.telegramBotToken;
  const chatId = overrideChatId || config.telegramChatId;
  const bot = getBot(token);

  if (!bot || !chatId) {
    logger.warn('Telegram not configured — skipping notification');
    return;
  }
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    logger.info('Telegram notification sent successfully');
  } catch (err: any) {
    logger.error('Failed to send Telegram notification:', err.message);
    throw err;
  }
}

// ── Email Helpers ─────────────────────────────────────────────────────────────

function getTransporter(customConfig?: Partial<NotificationConfigData>) {
  const host = customConfig?.smtpHost || cachedConfig?.smtpHost || process.env.SMTP_HOST;
  if (!host) return null;

  const port = customConfig?.smtpPort || cachedConfig?.smtpPort || parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = customConfig?.smtpSecure ?? cachedConfig?.smtpSecure ?? (process.env.SMTP_SECURE === 'true');
  const user = customConfig?.smtpUser || cachedConfig?.smtpUser || process.env.SMTP_USER;
  const pass = customConfig?.smtpPass || cachedConfig?.smtpPass || process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  customConfig?: Partial<NotificationConfigData>
): Promise<void> {
  const config = await getNotificationConfig();
  const transporter = getTransporter(customConfig);
  if (!transporter) {
    logger.warn('Email not configured — skipping notification');
    return;
  }
  try {
    const from = customConfig?.smtpFrom || config.smtpFrom || process.env.SMTP_FROM || 'SEGIP Monitor <notificaciones@segip.gob.bo>';
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    logger.info(`Email sent successfully to ${to}`);
  } catch (err: any) {
    logger.error('Failed to send email:', err.message);
    throw err;
  }
}

// ── Alert Notifications ───────────────────────────────────────────────────────

export async function sendAlert(
  service: Service,
  alert: Alert,
  result: ProbeResult
): Promise<void> {
  const config = await getNotificationConfig();
  const statusText = alert.type === 'DEGRADED' ? 'DEGRADADO' : 'CAÍDO';

  // Telegram message
  const telegramMsg = [
    `<b>[ALERTA INSTITUCIONAL] ${service.name}</b>`,
    `Estado: <b>${statusText}</b>`,
    result.httpCode ? `HTTP Code: <code>${result.httpCode}</code>` : '',
    result.responseTime ? `Tiempo de Respuesta: <code>${result.responseTime}ms</code>` : '',
    result.error ? `Detalle Error: <code>${result.error.slice(0, 200)}</code>` : '',
    `URL / Endpoint: <code>${service.url}</code>`,
    `\nFecha y Hora: ${new Date().toLocaleString('es-BO')}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (config.telegramEnabled && service.notifyTelegram) {
    try {
      await sendTelegram(telegramMsg);
      await prisma.alert.update({ where: { id: alert.id }, data: { notifiedTelegram: true } });
    } catch (err) {
      logger.error('Error sending alert via Telegram:', err);
    }
  }

  // Email message
  const emailHtml = `
    <div style="font-family:'Urbanist',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:${alert.type === 'DEGRADED' ? '#d97706' : '#245b87'};padding:20px;color:white">
        <h2 style="margin:0;font-size:18px">ALERTA INSTITUCIONAL — ${service.name}</h2>
        <p style="margin:5px 0 0 0;font-size:12px;opacity:0.9">Servicio General de Identificación Personal &bull; SEGIP</p>
      </div>
      <div style="background:#ffffff;padding:24px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;font-weight:bold;color:#64748b">Estado:</td><td style="padding:10px 0;font-weight:bold;color:${alert.type === 'DEGRADED' ? '#d97706' : '#dc2626'}">${statusText}</td></tr>
          ${result.httpCode ? `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;font-weight:bold;color:#64748b">Código HTTP:</td><td style="padding:10px 0">${result.httpCode}</td></tr>` : ''}
          ${result.responseTime ? `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;font-weight:bold;color:#64748b">Latencia:</td><td style="padding:10px 0">${result.responseTime} ms</td></tr>` : ''}
          <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;font-weight:bold;color:#64748b">Endpoint / URL:</td><td style="padding:10px 0"><a href="${service.url}" style="color:#245b87">${service.url}</a></td></tr>
          ${result.error ? `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;font-weight:bold;color:#64748b">Detalle Error:</td><td style="padding:10px 0;color:#dc2626;font-family:monospace;font-size:12px">${result.error}</td></tr>` : ''}
          <tr><td style="padding:10px 0;font-weight:bold;color:#64748b">Fecha y Hora:</td><td style="padding:10px 0">${new Date().toLocaleString('es-BO')}</td></tr>
        </table>
      </div>
      <div style="background:#f8fafc;padding:12px;text-align:center;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
        SEGIP MONITOR &bull; Notificación Automática de Disponibilidad
      </div>
    </div>
  `;

  const emailRecipients = [
    config.alertEmailTo,
    service.notifyEmailTo,
  ]
    .filter(Boolean)
    .join(',');

  if (config.emailEnabled && service.notifyEmail && emailRecipients) {
    try {
      await sendEmail(emailRecipients, `[ALERTA SEGIP] ${service.name} está ${statusText}`, emailHtml);
      await prisma.alert.update({ where: { id: alert.id }, data: { notifiedEmail: true } });
    } catch (err) {
      logger.error('Error sending alert via Email:', err);
    }
  }
}

export async function sendRecovery(service: Service, alert: Alert): Promise<void> {
  const config = await getNotificationConfig();
  const duration = alert.resolvedAt
    ? Math.round((alert.resolvedAt.getTime() - alert.startedAt.getTime()) / 60000)
    : 0;

  const telegramMsg = [
    `<b>[RESTABLECIDO] ${service.name}</b>`,
    `El servicio ha vuelto a responder con normalidad.`,
    duration > 0 ? `Duración de la indisponibilidad: <b>${duration} minutos</b>` : '',
    `\nFecha y Hora: ${new Date().toLocaleString('es-BO')}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (config.telegramEnabled && service.notifyTelegram) {
    try {
      await sendTelegram(telegramMsg);
    } catch (err) {
      logger.error('Error sending recovery via Telegram:', err);
    }
  }

  const emailHtml = `
    <div style="font-family:'Urbanist',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#16a34a;padding:20px;color:white">
        <h2 style="margin:0;font-size:18px">SERVICIO RESTABLECIDO — ${service.name}</h2>
        <p style="margin:5px 0 0 0;font-size:12px;opacity:0.9">Servicio General de Identificación Personal &bull; SEGIP</p>
      </div>
      <div style="background:#ffffff;padding:24px">
        <p style="font-size:14px;color:#1e293b">El servicio monitoreado ha recuperado su estado operativo normal.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px">
          ${duration > 0 ? `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;font-weight:bold;color:#64748b">Tiempo de Indisponibilidad:</td><td style="padding:10px 0;font-weight:bold">${duration} minutos</td></tr>` : ''}
          <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;font-weight:bold;color:#64748b">Endpoint / URL:</td><td style="padding:10px 0"><a href="${service.url}" style="color:#245b87">${service.url}</a></td></tr>
          <tr><td style="padding:10px 0;font-weight:bold;color:#64748b">Hora de Recuperación:</td><td style="padding:10px 0">${new Date().toLocaleString('es-BO')}</td></tr>
        </table>
      </div>
      <div style="background:#f8fafc;padding:12px;text-align:center;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
        SEGIP MONITOR &bull; Notificación Automática de Disponibilidad
      </div>
    </div>
  `;

  const emailRecipients = [
    config.alertEmailTo,
    service.notifyEmailTo,
  ]
    .filter(Boolean)
    .join(',');

  if (config.emailEnabled && service.notifyEmail && emailRecipients) {
    try {
      await sendEmail(emailRecipients, `[RESTABLECIDO SEGIP] ${service.name} está Operativo`, emailHtml);
    } catch (err) {
      logger.error('Error sending recovery via Email:', err);
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

const reportIntervals: Record<string, number> = {
  '1h': 1,
  '6h': 6,
  '12h': 12,
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

export async function sendScheduledReport(
  interval = '24h',
  channels?: { telegram?: boolean; email?: boolean }
): Promise<void> {
  const config = await getNotificationConfig();
  const hours = reportIntervals[interval] || reportIntervals['24h'];
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
  const checks = await prisma.check.findMany({
    where: { timestamp: { gte: from, lte: to } },
    orderBy: [{ serviceId: 'asc' }, { timestamp: 'asc' }],
    select: { serviceId: true, timestamp: true, status: true },
  });

  const lines = services.map((service) => {
    const serviceChecks = checks.filter((check) => check.serviceId === service.id);
    const degraded = serviceChecks.filter((check) => check.status === 'DEGRADED');
    const down = serviceChecks.filter((check) => check.status === 'DOWN' || check.status === 'TIMEOUT');
    const up = serviceChecks.filter((check) => check.status === 'UP').length;
    const uptime = serviceChecks.length ? ((up / serviceChecks.length) * 100).toFixed(1) : '100.0';
    const formatTimes = (items: typeof serviceChecks) => items.length
      ? items.map((item) => new Date(item.timestamp).toLocaleString('es-BO')).join(', ')
      : 'ninguna';
    return `${service.name}: disponibilidad ${uptime}%, degradado (${degraded.length}): ${formatTimes(degraded)}, caído (${down.length}): ${formatTimes(down)}`;
  });

  const title = `REPORTE DE SERVICIOS - ULTIMAS ${interval}`;
  const telegramMessage = [`<b>${title}</b>`, `Periodo: ${from.toLocaleString('es-BO')} - ${to.toLocaleString('es-BO')}`, ...lines].join('\n');
  const rows = services.map((service) => {
    const serviceChecks = checks.filter((check) => check.serviceId === service.id);
    const degraded = serviceChecks.filter((check) => check.status === 'DEGRADED');
    const down = serviceChecks.filter((check) => check.status === 'DOWN' || check.status === 'TIMEOUT');
    const up = serviceChecks.filter((check) => check.status === 'UP').length;
    const uptime = serviceChecks.length ? ((up / serviceChecks.length) * 100).toFixed(1) : '100.0';
    return `<tr><td>${escapeHtml(service.name)}</td><td>${uptime}%</td><td>${degraded.length}</td><td>${down.length}</td><td>${escapeHtml(degraded.map((item) => new Date(item.timestamp).toLocaleString('es-BO')).join(', ') || 'Ninguna')}</td><td>${escapeHtml(down.map((item) => new Date(item.timestamp).toLocaleString('es-BO')).join(', ') || 'Ninguna')}</td></tr>`;
  }).join('');
  const emailHtml = `<div style="font-family:Arial,sans-serif;max-width:1000px;margin:auto"><h2>${title}</h2><p>Periodo: ${from.toLocaleString('es-BO')} - ${to.toLocaleString('es-BO')}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th>Servicio</th><th>Disponibilidad</th><th>Degradaciones</th><th>Caídas</th><th>Horas degradado</th><th>Horas caído</th></tr></thead><tbody>${rows}</tbody></table><p style="color:#64748b;font-size:12px">SEGIP Monitor - Reporte automático</p></div>`;
  const recipients = config.alertEmailTo || '';

  // Canales: si se pasan por parámetro se usan, si no se envía sólo por Telegram por defecto
  const useTelegram = channels !== undefined ? (channels.telegram ?? false) : true;
  const useEmail = channels !== undefined ? (channels.email ?? false) : false;

  if (useTelegram && config.telegramEnabled) await sendTelegram(telegramMessage.slice(0, 3900));
  if (useEmail && config.emailEnabled && recipients) await sendEmail(recipients, `[SEGIP] ${title}`, emailHtml);
  logger.info(`Service report generated for ${interval}`);
}

export async function sendDailyReport(): Promise<void> {
  await sendScheduledReport('24h');
}

