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

// GET /api/checks/service/:serviceId/history?period=24h|7d|30d
checksRouter.get('/service/:serviceId/history', async (req: AuthRequest, res: Response) => {
  const { serviceId } = req.params;
  const { period = '24h' } = req.query as { period?: string };

  const periodMap: Record<string, number> = {
    '1h': 1,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
    '90d': 24 * 90,
  };

  const hours = periodMap[period] || 24;
  const from = new Date(Date.now() - hours * 60 * 60 * 1000);

  const checks = await prisma.check.findMany({
    where: { serviceId, timestamp: { gte: from } },
    orderBy: { timestamp: 'asc' },
    select: {
      id: true,
      timestamp: true,
      status: true,
      responseTime: true,
      httpCode: true,
      pingAvg: true,
    },
  });

  res.json(checks);
});
