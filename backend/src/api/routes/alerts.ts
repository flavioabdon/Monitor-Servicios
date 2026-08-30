import { Router, Response } from 'express';
import { prisma } from '../../db/client';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

export const alertsRouter = Router();
alertsRouter.use(authMiddleware);

alertsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { resolved, serviceId } = req.query as Record<string, string>;
  const alerts = await prisma.alert.findMany({
    where: {
      ...(serviceId ? { serviceId } : {}),
      ...(resolved === 'true' ? { resolvedAt: { not: null } } : {}),
      ...(resolved === 'false' ? { resolvedAt: null } : {}),
    },
    include: { service: { select: { id: true, name: true, type: true, group: true } } },
    orderBy: { startedAt: 'desc' },
    take: 100,
  });
  res.json(alerts);
});

alertsRouter.patch('/:id/acknowledge', async (req: AuthRequest, res: Response) => {
  const alert = await prisma.alert.update({
    where: { id: req.params.id },
    data: { acknowledged: true },
  });
  res.json(alert);
});

