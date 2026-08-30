import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  getNotificationConfig,
  saveNotificationConfig,
  sendTelegram,
  sendEmail,
} from '../../notifiers';
import { logger } from '../../utils/logger';

export const configRouter = Router();

// Require authentication for all configuration endpoints
configRouter.use(authMiddleware);

/**
 * GET /api/config/notifications
 * Returns current notification settings (Telegram & SMTP)
 */
configRouter.get('/notifications', async (req: Request, res: Response) => {
  try {
    const config = await getNotificationConfig();
    res.json({
      telegramEnabled: config.telegramEnabled,
      telegramBotToken: config.telegramBotToken,
      telegramChatId: config.telegramChatId,
      emailEnabled: config.emailEnabled,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser,
      smtpPass: config.smtpPass ? '••••••••' : '',
      smtpFrom: config.smtpFrom,
      alertEmailTo: config.alertEmailTo,
    });
  } catch (err: any) {
    logger.error('Error fetching notification config:', err);
    res.status(500).json({ error: 'Error al obtener la configuración de notificaciones' });
  }
});

/**
 * PUT /api/config/notifications
 * Updates notification settings
 */
configRouter.put('/notifications', async (req: Request, res: Response) => {
  try {
    const updated = await saveNotificationConfig(req.body);
    res.json({
      message: 'Configuración de notificaciones actualizada con éxito',
      config: {
        telegramEnabled: updated.telegramEnabled,
        telegramBotToken: updated.telegramBotToken,
        telegramChatId: updated.telegramChatId,
        emailEnabled: updated.emailEnabled,
        smtpHost: updated.smtpHost,
        smtpPort: updated.smtpPort,
        smtpSecure: updated.smtpSecure,
        smtpUser: updated.smtpUser,
        smtpPass: updated.smtpPass ? '••••••••' : '',
        smtpFrom: updated.smtpFrom,
        alertEmailTo: updated.alertEmailTo,
      },
    });
  } catch (err: any) {
    logger.error('Error saving notification config:', err);
    res.status(500).json({ error: 'Error al guardar la configuración de notificaciones' });
  }
});

/**
 * POST /api/config/notifications/test-telegram
 * Sends a test message to Telegram
 */
configRouter.post('/notifications/test-telegram', async (req: Request, res: Response) => {
  try {
    const { botToken, chatId } = req.body;
    const testMsg = [
      `🔔 <b>[PRUEBA DE CONEXIÓN] SEGIP MONITOR</b>`,
      `Esta es una notificación de prueba del sistema de monitoreo institucional del SEGIP.`,
      `\n✅ <b>Integración con Telegram: CORRECTA</b>`,
      `🕐 <i>${new Date().toLocaleString('es-BO')}</i>`,
    ].join('\n');

    await sendTelegram(testMsg, chatId, botToken);
    res.json({ success: true, message: 'Mensaje de prueba enviado exitosamente a Telegram' });
  } catch (err: any) {
    logger.error('Error in test Telegram notification:', err);
    res.status(400).json({
      error: `Fallo al enviar mensaje a Telegram: ${err.message || 'Verifique el Token del Bot y el Chat ID'}`,
    });
  }
});

/**
 * POST /api/config/notifications/test-email
 * Sends a test email
 */
configRouter.post('/notifications/test-email', async (req: Request, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, testRecipient } = req.body;
    
    if (!testRecipient) {
      return res.status(400).json({ error: 'Debe especificar el correo destinatario de prueba' });
    }

    const testHtml = `
      <div style="font-family:'Urbanist',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#790026;padding:20px;color:white">
          <h2 style="margin:0;font-size:18px">🔔 PRUEBA DE NOTIFICACIÓN POR CORREO</h2>
          <p style="margin:5px 0 0 0;font-size:12px;opacity:0.9">Servicio General de Identificación Personal &bull; SEGIP</p>
        </div>
        <div style="background:#ffffff;padding:24px">
          <p style="font-size:14px;color:#1e293b;margin-top:0">
            Este es un correo de prueba generado desde el panel de administración de <b>SEGIP Monitor</b>.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;color:#166534;font-size:13px;margin:15px 0">
            ✅ <b>Servidor SMTP configurado y autenticado correctamente.</b>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;color:#64748b">
            <tr><td style="padding:6px 0">Servidor SMTP:</td><td style="color:#1e293b">${smtpHost}:${smtpPort}</td></tr>
            <tr><td style="padding:6px 0">Remitente:</td><td style="color:#1e293b">${smtpFrom || smtpUser}</td></tr>
            <tr><td style="padding:6px 0">Fecha de Envío:</td><td style="color:#1e293b">${new Date().toLocaleString('es-BO')}</td></tr>
          </table>
        </div>
        <div style="background:#f8fafc;padding:12px;text-align:center;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
          SEGIP MONITOR &bull; Prueba de Conectividad SMTP
        </div>
      </div>
    `;

    const configOverride = {
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpSecure: Boolean(smtpSecure),
      smtpUser,
      smtpPass: smtpPass && smtpPass !== '••••••••' ? smtpPass : undefined,
      smtpFrom,
    };

    await sendEmail(testRecipient, '🔔 [PRUEBA] SEGIP Monitor — Conectividad SMTP', testHtml, configOverride);
    res.json({ success: true, message: `Correo de prueba enviado con éxito a ${testRecipient}` });
  } catch (err: any) {
    logger.error('Error in test Email notification:', err);
    res.status(400).json({
      error: `Fallo al enviar correo: ${err.message || 'Verifique el host SMTP, puerto y credenciales'}`,
    });
  }
});
