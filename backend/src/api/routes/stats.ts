import { Router, Request, Response } from 'express';
import { prisma } from '../../db/client';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { analyzeIncidentWithOllama, generateDailyAiSummary } from '../../services/ollamaService';

export const statsRouter = Router();

// ──────────────────────────────────────────────
// Public Endpoint for TV Mode (No auth needed for monitor screens)
// ──────────────────────────────────────────────
statsRouter.get('/tv', async (_req: Request, res: Response) => {
  const services = await prisma.service.findMany({
    where: { enabled: true },
    include: {
      group: { select: { id: true, name: true, color: true } },
      checks: {
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: { status: true, responseTime: true, timestamp: true, httpCode: true, pingAvg: true, pingLoss: true, sslDaysLeft: true },
      },
      alerts: {
        where: { resolvedAt: null },
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ groupId: 'asc' }, { name: 'asc' }],
  });

  const total = services.length;
  let up = 0;
  let degraded = 0;
  let down = 0;

  services.forEach((s) => {
    const lastCheck = s.checks[0];
    if (!lastCheck || lastCheck.status === 'UP') up++;
    else if (lastCheck.status === 'DEGRADED') degraded++;
    else down++;
  });

  // Global average response time in last 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentChecks = await prisma.check.findMany({
    where: { timestamp: { gte: oneHourAgo } },
    select: { responseTime: true, status: true },
  });

  const avgResponseTime = recentChecks.length > 0
    ? Math.round(recentChecks.reduce((acc, c) => acc + (c.responseTime || 0), 0) / recentChecks.length)
    : 0;

  const totalRecent = recentChecks.length;
  const upRecent = recentChecks.filter(c => c.status === 'UP').length;
  const uptimePercent = totalRecent > 0 ? parseFloat(((upRecent / totalRecent) * 100).toFixed(1)) : 100;

  const activeAlerts = await prisma.alert.findMany({
    where: { resolvedAt: null },
    include: { service: { select: { name: true, type: true } } },
    orderBy: { startedAt: 'desc' },
  });

  res.json({
    summary: {
      total,
      up,
      degraded,
      down,
      avgResponseTime,
      uptimePercent,
      activeAlertCount: activeAlerts.length,
    },
    services,
    activeAlerts,
    updatedAt: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────
// Authenticated Stats Endpoints
// ──────────────────────────────────────────────
statsRouter.use(authMiddleware);

// GET /api/stats/dashboard — Global overview stats
statsRouter.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalServices, activeAlerts, recentChecks, groups] = await Promise.all([
    prisma.service.count({ where: { enabled: true } }),
    prisma.alert.findMany({
      where: { resolvedAt: null },
      include: { service: { select: { id: true, name: true, type: true } } },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.check.findMany({
      where: { timestamp: { gte: yesterday } },
      select: { status: true, responseTime: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.serviceGroup.findMany({
      include: {
        services: {
          where: { enabled: true },
          include: {
            checks: { orderBy: { timestamp: 'desc' }, take: 1 },
          },
        },
      },
    }),
  ]);

  const totalChecks = recentChecks.length;
  const upChecks = recentChecks.filter((c) => c.status === 'UP').length;
  const globalUptime = totalChecks > 0 ? ((upChecks / totalChecks) * 100).toFixed(2) : '100.00';
  const avgResponseTime = totalChecks > 0
    ? Math.round(recentChecks.reduce((acc, c) => acc + (c.responseTime || 0), 0) / totalChecks)
    : 0;

  // Group status distribution
  const groupStats = groups.map((g) => {
    let gUp = 0, gDegraded = 0, gDown = 0;
    g.services.forEach((s) => {
      const last = s.checks[0];
      if (!last || last.status === 'UP') gUp++;
      else if (last.status === 'DEGRADED') gDegraded++;
      else gDown++;
    });
    return {
      id: g.id,
      name: g.name,
      color: g.color,
      total: g.services.length,
      up: gUp,
      degraded: gDegraded,
      down: gDown,
    };
  });

  res.json({
    totalServices,
    activeAlertsCount: activeAlerts.length,
    activeAlerts,
    globalUptime,
    avgResponseTime,
    groupStats,
  });
});

// POST /api/stats/ai/analyze-incident — Analyze an incident with Ollama Local
statsRouter.post('/ai/analyze-incident', async (req: AuthRequest, res: Response) => {
  const { serviceId, errorMessage, bodySnippet, httpCode } = req.body;
  const service = serviceId ? await prisma.service.findUnique({ where: { id: serviceId } }) : null;

  const analysis = await analyzeIncidentWithOllama({
    serviceName: service?.name || 'Servicio SEGIP',
    serviceType: service?.type || 'API/Web',
    httpCode,
    errorMessage,
    bodySnippet,
  });

  res.json({ analysis });
});

// GET /api/stats/ai/daily-summary — Generate executive AI summary with Ollama Local
statsRouter.get('/ai/daily-summary', async (_req: AuthRequest, res: Response) => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const services = await prisma.service.findMany({ where: { enabled: true } });
  const alerts = await prisma.alert.findMany({
    where: { startedAt: { gte: yesterday } },
    include: { service: true },
  });

  const summary = await generateDailyAiSummary(services, alerts);
  res.json({ summary });
});
