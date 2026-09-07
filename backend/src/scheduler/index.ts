import cron from 'node-cron';
import { prisma } from '../db/client';
import { runProbeForService } from '../probes/probeRunner';
import { logger } from '../utils/logger';
import { getNotificationConfig, sendScheduledReport } from '../notifiers';

// Track scheduled tasks per service
type ScheduledTaskType = ReturnType<typeof cron.schedule>;
const scheduledTasks = new Map<string, ScheduledTaskType>();

/**
 * Initialize the scheduler:
 * - Loads all enabled services from DB
 * - Creates a cron task for each based on their interval
 * - Runs a meta-scheduler every 60s to pick up new/changed services
 */
export function initScheduler() {
  // Initial load
  loadAndScheduleServices();

  // Meta-scheduler: reload service list every 60 seconds
  // This picks up newly added or modified services
  cron.schedule('* * * * *', async () => {
    await loadAndScheduleServices();
  });

  // Check configured report times every minute (server local timezone).
  cron.schedule('* * * * *', async () => {
    const config = await getNotificationConfig();
    if (!config.reportEnabled) return;
    const currentTime = new Date().toTimeString().slice(0, 5);
    const configuredTimes = config.reportTimes.split(',').map((time) => time.trim());
    if (configuredTimes.includes(currentTime)) {
      logger.info(`Sending service report scheduled for ${currentTime}...`);
      await sendScheduledReport(config.reportInterval);
    }
  });

  logger.info('Scheduler initialized');
}

async function loadAndScheduleServices() {
  try {
    const services = await prisma.service.findMany({
      where: { enabled: true },
    });

    const serviceIds = new Set(services.map((s) => s.id));

    // Remove tasks for deleted/disabled services
    for (const [id, task] of scheduledTasks.entries()) {
      if (!serviceIds.has(id)) {
        task.stop();
        scheduledTasks.delete(id);
        logger.info(`Removed scheduler for service: ${id}`);
      }
    }

    // Add/update tasks for active services
    for (const service of services) {
      const existingTask = scheduledTasks.get(service.id);

      // Only re-schedule if not already scheduled
      // (interval changes require restart — acceptable for v1)
      if (!existingTask) {
        scheduleService(service);
      }
    }
  } catch (err) {
    logger.error('Failed to load services for scheduling:', err);
  }
}

function scheduleService(service: { id: string; name: string; interval: number }) {
  // Convert interval (seconds) to cron expression
  // node-cron supports seconds with 6-field expressions
  const cronExpr = intervalToCron(service.interval);

  const task = cron.schedule(cronExpr, async () => {
    try {
      const freshService = await prisma.service.findUnique({ where: { id: service.id } });
      if (freshService && freshService.enabled) {
        await runProbeForService(freshService);
      }
    } catch (err) {
      logger.error(`Scheduled probe error for ${service.name}:`, err);
    }
  });

  scheduledTasks.set(service.id, task);
  logger.info(`Scheduled: ${service.name} every ${service.interval}s (${cronExpr})`);

  // Run immediately on first schedule
  setTimeout(async () => {
    try {
      const freshService = await prisma.service.findUnique({ where: { id: service.id } });
      if (freshService && freshService.enabled) {
        await runProbeForService(freshService);
      }
    } catch (err) {
      logger.error(`Initial probe error for ${service.name}:`, err);
    }
  }, 1000 + Math.random() * 5000); // stagger initial runs
}

/**
 * Converts an interval in seconds to a cron expression.
 * node-cron supports 6-field expressions with seconds.
 */
function intervalToCron(intervalSeconds: number): string {
  if (intervalSeconds < 60) {
    // Every N seconds
    return `*/${intervalSeconds} * * * * *`;
  } else if (intervalSeconds < 3600) {
    // Every N minutes
    const minutes = Math.floor(intervalSeconds / 60);
    return `0 */${minutes} * * * *`;
  } else {
    // Every N hours
    const hours = Math.floor(intervalSeconds / 3600);
    return `0 0 */${hours} * * *`;
  }
}

/**
 * Trigger an immediate probe for a service (used by API endpoints).
 */
export async function triggerProbeNow(serviceId: string): Promise<void> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) throw new Error(`Service ${serviceId} not found`);
  await runProbeForService(service);
}
