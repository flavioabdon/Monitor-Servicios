import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { triggerProbeNow } from '../../scheduler';

export const servicesRouter = Router();
servicesRouter.use(authMiddleware);

const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['WEB_INSTITUCIONAL', 'SISTEMA_WEB', 'API_JSON', 'SOAP_WSDL', 'SOAP_OPERACION', 'LOGIN_CHECK', 'PING', 'DNS', 'SSL_CERT']),
  url: z.string().min(1),
  host: z.string().optional(),
  groupId: z.string().optional(),
  method: z.string().optional().default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  followRedirects: z.boolean().optional().default(true),
  expectedHttpCode: z.number().optional(),
  expectedKeyword: z.string().optional(),
  unexpectedKeyword: z.string().optional(),
  loginSuccessField: z.string().optional(),
  loginSuccessValue: z.string().optional(),
  loginFailureKeyword: z.string().optional(),
  soapAction: z.string().optional(),
  soapEnvelope: z.string().optional(),
  timeout: z.number().min(1000).max(60000).optional().default(10000),
  interval: z.number().min(10).max(86400).optional().default(60),
  slaTarget: z.number().min(0).max(100).optional(),
  slowThresholdMs: z.number().optional(),
  failureThreshold: z.number().min(1).max(10).optional().default(3),
  sslAlertDaysBefore: z.number().optional(),
  notifyTelegram: z.boolean().optional().default(true),
  notifyEmail: z.boolean().optional().default(true),
  notifyEmailTo: z.string().optional(),
  enabled: z.boolean().optional().default(true),
});

// GET /api/services — list all services with their latest check
servicesRouter.get('/', async (_req: AuthRequest, res: Response) => {
  const services = await prisma.service.findMany({
    include: {
      group: { select: { id: true, name: true, color: true } },
      checks: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        select: {
          status: true,
          responseTime: true,
          timestamp: true,
          httpCode: true,
          sslDaysLeft: true,
          sslExpiry: true,
          error: true,
        },
      },
      alerts: {
        where: { resolvedAt: null },
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ groupId: 'asc' }, { name: 'asc' }],
  });

  res.json(services);
});

// GET /api/services/:id — get single service
servicesRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: {
      group: true,
      checks: {
        orderBy: { timestamp: 'desc' },
        take: 100,
      },
      alerts: {
        orderBy: { startedAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!service) { res.status(404).json({ error: 'Service not found' }); return; }
  res.json(service);
});

// POST /api/services — create service
servicesRouter.post('/', async (req: AuthRequest, res: Response) => {
  const data = serviceSchema.parse(req.body);
  const service = await prisma.service.create({ data: data as any });
  res.status(201).json(service);
});

// PUT /api/services/:id — update service
servicesRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const data = serviceSchema.partial().parse(req.body);
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: data as any,
  });
  res.json(service);
});

// DELETE /api/services/:id — delete service
servicesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.service.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// POST /api/services/:id/probe — trigger immediate probe
servicesRouter.post('/:id/probe', async (req: AuthRequest, res: Response) => {
  await triggerProbeNow(req.params.id);
  res.json({ message: 'Probe triggered' });
});

// PATCH /api/services/:id/toggle — enable/disable
servicesRouter.patch('/:id/toggle', async (req: AuthRequest, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) { res.status(404).json({ error: 'Not found' }); return; }
  const updated = await prisma.service.update({
    where: { id: req.params.id },
    data: { enabled: !service.enabled },
  });
  res.json(updated);
});
