import tls from 'tls';
import { Service } from '@prisma/client';
import { ProbeResult } from './httpProbe';

export interface SslResult extends ProbeResult {
  sslDaysLeft?: number;
  sslExpiry?: Date;
}

/**
 * SSL_CERT — Connects via TLS and inspects the certificate.
 * Returns days until expiry and raises DEGRADED/DOWN when near expiry.
 */
export async function sslProbe(service: Service): Promise<SslResult> {
  const url = service.url;
  let host: string;
  let port = 443;

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    host = parsed.hostname;
    port = parseInt(parsed.port || '443', 10);
  } catch {
    host = url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }

  const start = Date.now();

  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: false },
      () => {
        const responseTime = Date.now() - start;
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert || !cert.valid_to) {
          resolve({
            status: 'DEGRADED',
            responseTime,
            error: 'Could not retrieve certificate information',
          });
          return;
        }

        const expiryDate = new Date(cert.valid_to);
        const now = new Date();
        const msLeft = expiryDate.getTime() - now.getTime();
        const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
        const alertDays = service.sslAlertDaysBefore ?? 30;

        let status: 'UP' | 'DEGRADED' | 'DOWN' = 'UP';
        let error: string | undefined;

        if (daysLeft <= 0) {
          error = `SSL certificate EXPIRED on ${expiryDate.toISOString().split('T')[0]}`;
        } else if (daysLeft <= alertDays) {
          error = `SSL certificate expires in ${daysLeft} days (${expiryDate.toISOString().split('T')[0]})`;
        }

        resolve({
          status,
          responseTime,
          sslDaysLeft: daysLeft,
          sslExpiry: expiryDate,
          error,
        });
      }
    );

    socket.setTimeout(service.timeout, () => {
      socket.destroy();
      resolve({
        status: 'TIMEOUT',
        responseTime: Date.now() - start,
        error: `SSL connection timed out after ${service.timeout}ms`,
      });
    });

    socket.on('error', (err) => {
      resolve({
        status: 'DOWN',
        responseTime: Date.now() - start,
        error: err.message.slice(0, 500),
      });
    });
  });
}
