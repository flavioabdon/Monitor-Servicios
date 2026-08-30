import { Router, Response } from 'express';
import { prisma } from '../../db/client';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

export const checksRouter = Router();
checksRouter.use(authMiddleware);

// GET /api/checks?serviceId=&limit=&from=&to=
checksRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { serviceId, limit = '50', from, to } = req.query as Record<string, string>;
  const checks = await prisma.check.findMany({
    where: {
      ...(serviceId ? { serviceId } : {}),
      timestamp: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    },
    orderBy: { timestamp: 'desc' },
    take: parseInt(limit, 10),
  });
  res.json(checks);
});

// GET /api/checks/service/:serviceId/history?period=1h|6h|24h|7d|30d|custom&from=&to=&aggregate=
checksRouter.get('/service/:serviceId/history', async (req: AuthRequest, res: Response) => {
  const { serviceId } = req.params;
  const { period = '24h', from: fromQuery, to: toQuery, aggregate } = req.query as {
    period?: string;
    from?: string;
    to?: string;
    aggregate?: string;
  };

  let fromDate: Date;
  let toDate: Date = toQuery ? new Date(toQuery) : new Date();

  if (fromQuery) {
    fromDate = new Date(fromQuery);
  } else {
    const periodMap: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
      '90d': 24 * 90,
    };
    const hours = periodMap[period] || 24;
    fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  const checks = await prisma.check.findMany({
    where: {
      serviceId,
      timestamp: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: { timestamp: 'asc' },
    select: {
      id: true,
      timestamp: true,
      status: true,
      responseTime: true,
      httpCode: true,
      error: true,
      bodySnippet: true,
      pingMin: true,
      pingAvg: true,
      pingMax: true,
      pingLoss: true,
      sslDaysLeft: true,
      dnsResolved: true,
      dnsIp: true,
    },
  });

  // Calculate GCP-style summary statistics
  const total = checks.length;
  const up = checks.filter((c) => c.status === 'UP').length;
  const degraded = checks.filter((c) => c.status === 'DEGRADED').length;
  const down = checks.filter((c) => c.status === 'DOWN' || c.status === 'TIMEOUT').length;
  const uptimePercent = total > 0 ? Number(((up / total) * 100).toFixed(2)) : 100;

  const validResponseTimes = checks
    .map((c) => c.responseTime ?? (c.pingAvg ? Math.round(c.pingAvg) : null))
    .filter((v): v is number => v !== null && !isNaN(v))
    .sort((a, b) => a - b);

  let avgResponseTime = 0;
  let minResponseTime = 0;
  let maxResponseTime = 0;
  let p95ResponseTime = 0;
  let p99ResponseTime = 0;

  if (validResponseTimes.length > 0) {
    const sum = validResponseTimes.reduce((acc, v) => acc + v, 0);
    avgResponseTime = Math.round(sum / validResponseTimes.length);
    minResponseTime = validResponseTimes[0];
    maxResponseTime = validResponseTimes[validResponseTimes.length - 1];

    const p95Idx = Math.floor(validResponseTimes.length * 0.95);
    const p99Idx = Math.floor(validResponseTimes.length * 0.99);
    p95ResponseTime = validResponseTimes[Math.min(p95Idx, validResponseTimes.length - 1)];
    p99ResponseTime = validResponseTimes[Math.min(p99Idx, validResponseTimes.length - 1)];
  }

  res.json({
    period,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    summary: {
      total,
      up,
      degraded,
      down,
      uptimePercent,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
    },
    checks,
  });
});
