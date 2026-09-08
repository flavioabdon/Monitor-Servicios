import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

export const reportScheduleRouter = Router();

reportScheduleRouter.use(authMiddleware);

const VALID_INTERVALS = ['1h', '6h', '12h', '24h', '7d', '30d'];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * GET /api/report-schedules
 * Returns all report schedules ordered by time.
 */
reportScheduleRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const schedules = await prisma.reportSchedule.findMany({
      orderBy: [{ time: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(schedules);
  } catch (err) {
    logger.error('Error fetching report schedules:', err);
    res.status(500).json({ error: 'Error al obtener los horarios de reportes' });
  }
});

/**
 * POST /api/report-schedules
 * Creates a new report schedule.
 */
reportScheduleRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { label, time, interval = '24h', enabled = true, sendTelegram = true, sendEmail = false } = req.body;

    if (!time || !TIME_REGEX.test(time)) {
      return res.status(400).json({ error: 'La hora debe estar en formato HH:mm (ej: 08:00)' });
    }
    if (!VALID_INTERVALS.includes(interval)) {
      return res.status(400).json({ error: `El intervalo debe ser uno de: ${VALID_INTERVALS.join(', ')}` });
    }

    const schedule = await prisma.reportSchedule.create({
      data: {
        label: label?.trim() || null,
        time: time.trim(),
        interval,
        enabled: Boolean(enabled),
        sendTelegram: Boolean(sendTelegram),
        sendEmail: Boolean(sendEmail),
      },
    });

    logger.info(`ReportSchedule created: ${schedule.id} (${schedule.time})`);
    res.status(201).json(schedule);
  } catch (err) {
    logger.error('Error creating report schedule:', err);
    res.status(500).json({ error: 'Error al crear el horario de reporte' });
  }
});

/**
 * PUT /api/report-schedules/:id
 * Updates a report schedule.
 */
reportScheduleRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, time, interval, enabled, sendTelegram, sendEmail } = req.body;

    const existing = await prisma.reportSchedule.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    if (time !== undefined && !TIME_REGEX.test(time)) {
      return res.status(400).json({ error: 'La hora debe estar en formato HH:mm (ej: 08:00)' });
    }
    if (interval !== undefined && !VALID_INTERVALS.includes(interval)) {
      return res.status(400).json({ error: `El intervalo debe ser uno de: ${VALID_INTERVALS.join(', ')}` });
    }

    const updated = await prisma.reportSchedule.update({
      where: { id },
      data: {
        label: label !== undefined ? (label?.trim() || null) : existing.label,
        time: time !== undefined ? time.trim() : existing.time,
        interval: interval !== undefined ? interval : existing.interval,
        enabled: enabled !== undefined ? Boolean(enabled) : existing.enabled,
        sendTelegram: sendTelegram !== undefined ? Boolean(sendTelegram) : existing.sendTelegram,
        sendEmail: sendEmail !== undefined ? Boolean(sendEmail) : existing.sendEmail,
      },
    });

    logger.info(`ReportSchedule updated: ${id}`);
    res.json(updated);
  } catch (err) {
    logger.error('Error updating report schedule:', err);
    res.status(500).json({ error: 'Error al actualizar el horario de reporte' });
  }
});

/**
 * DELETE /api/report-schedules/:id
 * Deletes a report schedule.
 */
reportScheduleRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.reportSchedule.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    await prisma.reportSchedule.delete({ where: { id } });
    logger.info(`ReportSchedule deleted: ${id}`);
    res.json({ success: true, message: 'Horario eliminado correctamente' });
  } catch (err) {
    logger.error('Error deleting report schedule:', err);
    res.status(500).json({ error: 'Error al eliminar el horario de reporte' });
  }
});
