import { Router, Response } from 'express';
import { prisma } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';

export const groupsRouter = Router();
groupsRouter.use(authMiddleware);

groupsRouter.get('/', async (_req, res: Response) => {
  const groups = await prisma.serviceGroup.findMany({
    include: { _count: { select: { services: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(groups);
});

groupsRouter.post('/', async (req, res: Response) => {
  const { name, description, color } = req.body;
  const group = await prisma.serviceGroup.create({ data: { name, description, color } });
  res.status(201).json(group);
});

groupsRouter.put('/:id', async (req, res: Response) => {
  const { name, description, color } = req.body;
  const group = await prisma.serviceGroup.update({
    where: { id: req.params.id },
    data: { name, description, color },
  });
  res.json(group);
});

groupsRouter.delete('/:id', async (req, res: Response) => {
  await prisma.serviceGroup.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
