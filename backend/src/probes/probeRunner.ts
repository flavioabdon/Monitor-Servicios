import { Service, ServiceType, CheckStatus } from '@prisma/client';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { emitCheckResult, emitAlertUpdate } from '../utils/socketEmitter';
import { webInstitucionalProbe, sistemaWebProbe, apiJsonProbe, ProbeResult } from './httpProbe';
import { soapWsdlProbe, soapOperacionProbe } from './soapProbe';
import { loginCheckProbe } from './loginProbe';
import { pingProbe, dnsProbe, PingResult } from './pingProbe';
import { sslProbe, SslResult } from './sslProbe';
import { sendAlert, sendRecovery } from '../notifiers';

/**
 * Runs the appropriate probe for a service and saves the result to DB.
 * Also handles alert creation and resolution.
 */
export async function runProbeForService(service: Service): Promise<void> {
  logger.debug(`Running probe for: ${service.name} (${service.type})`);

  let result: ProbeResult | PingResult | SslResult;

  try {
    switch (service.type as ServiceType) {
      case 'WEB_INSTITUCIONAL':
        result = await webInstitucionalProbe(service);
        break;
      case 'SISTEMA_WEB':
        result = await sistemaWebProbe(service);
        break;
      case 'API_JSON':
        result = await apiJsonProbe(service);
        break;
      case 'SOAP_WSDL':
        result = await soapWsdlProbe(service);
        break;
      case 'SOAP_OPERACION':
        result = await soapOperacionProbe(service);
        break;
      case 'LOGIN_CHECK':
        result = await loginCheckProbe(service);
        break;
      case 'PING':
        result = await pingProbe(service);
        break;
      case 'DNS':
        result = await dnsProbe(service);
        break;
      case 'SSL_CERT':
        result = await sslProbe(service);
        break;
      default:
        logger.warn(`Unknown service type: ${service.type}`);
        return;
    }
  } catch (err) {
    logger.error(`Probe error for ${service.name}:`, err);
    result = { status: 'UNKNOWN' as CheckStatus, error: String(err).slice(0, 500) };
  }

  // ── Check if response is slow ──────────────────
  const isSlowAlert =
    service.slowThresholdMs &&
    result.responseTime &&
    result.responseTime > service.slowThresholdMs &&
    result.status === 'UP';

  // ── Save check to DB ───────────────────────────
  const pingResult = result as PingResult;
  const sslResult = result as SslResult;

  const check = await prisma.check.create({
    data: {
      serviceId: service.id,
      status: result.status,
      httpCode: result.httpCode,
      responseTime: result.responseTime,
      responseSize: result.responseSize,
      bodySnippet: result.bodySnippet,
      error: result.error,
      pingMin: pingResult.pingMin,
      pingAvg: pingResult.pingAvg,
      pingMax: pingResult.pingMax,
      pingLoss: pingResult.pingLoss,
      sslDaysLeft: sslResult.sslDaysLeft,
      sslExpiry: sslResult.sslExpiry,
      dnsResolved: pingResult.dnsResolved,
      dnsIp: pingResult.dnsIp,
    },
  });

  // Emit real-time update via WebSocket
  emitCheckResult(service.id, {
    checkId: check.id,
    serviceId: service.id,
    serviceName: service.name,
    status: check.status,
    responseTime: check.responseTime,
    timestamp: check.timestamp,
  });

  // ── Alert logic ────────────────────────────────
  await handleAlertLogic(service, check.status, result);
}

async function handleAlertLogic(
  service: Service,
  currentStatus: CheckStatus,
  result: ProbeResult
) {
  const isFailing = currentStatus === 'DOWN' || currentStatus === 'TIMEOUT';
  const isDegraded = currentStatus === 'DEGRADED';
  const isOk = currentStatus === 'UP';

  // Count consecutive failures
  const recentChecks = await prisma.check.findMany({
    where: { serviceId: service.id },
    orderBy: { timestamp: 'desc' },
    take: service.failureThreshold,
    select: { status: true },
  });

  const consecutiveFailures = recentChecks.every(
    (c) => c.status === 'DOWN' || c.status === 'TIMEOUT' || c.status === 'DEGRADED'
  );

  // Check for existing open alert
  const openAlert = await prisma.alert.findFirst({
    where: { serviceId: service.id, resolvedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  if ((isFailing || isDegraded) && consecutiveFailures && recentChecks.length === service.failureThreshold) {
    if (!openAlert) {
      // Create new alert
      const alertType = isDegraded ? 'DEGRADED' : 'DOWN';
      const alert = await prisma.alert.create({
        data: {
          serviceId: service.id,
          type: alertType,
          triggerHttpCode: result.httpCode,
          triggerStatus: currentStatus,
          triggerError: result.error,
        },
      });

      logger.warn(`[ALERTA]: ${service.name} is ${alertType}`);

      // Send notifications
      await sendAlert(service, alert, result);
      emitAlertUpdate({ type: 'NEW_ALERT', serviceId: service.id, alertType });
    }
  } else if (isOk && openAlert) {
    // Resolve existing alert
    await prisma.alert.update({
      where: { id: openAlert.id },
      data: { resolvedAt: new Date() },
    });

    logger.info(`[RECUPERADO]: ${service.name}`);
    await sendRecovery(service, openAlert);
    emitAlertUpdate({ type: 'ALERT_RESOLVED', serviceId: service.id });
  }
}
