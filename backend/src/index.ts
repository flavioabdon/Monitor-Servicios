import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { prisma } from './db/client';
import { authRouter } from './api/routes/auth';
import { servicesRouter } from './api/routes/services';
import { checksRouter } from './api/routes/checks';
import { alertsRouter } from './api/routes/alerts';
import { statsRouter } from './api/routes/stats';
import { groupsRouter } from './api/routes/groups';
import { errorHandler } from './middleware/errorHandler';
import { initScheduler } from './scheduler';
import { setSocketIO } from './utils/socketEmitter';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// ──────────────────────────────────────────────
// Socket.IO (real-time updates)
// ──────────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});
setSocketIO(io);

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/services', servicesRouter);
app.use('/api/checks', checksRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/groups', groupsRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
async function main() {
  // Verify DB connection
  await prisma.$connect();
  logger.info('Database connected');

  // Start HTTP server
  httpServer.listen(PORT, () => {
    logger.info(`SEGIP Monitor Backend running on port ${PORT}`);
  });

  // Start probe scheduler
  initScheduler();
  logger.info('Probe scheduler initialized');
}

main().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
