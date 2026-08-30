import ping from 'ping';
import dns from 'dns/promises';
import { Service } from '@prisma/client';
import { ProbeResult } from './httpProbe';

export interface PingResult extends ProbeResult {
  pingMin?: number;
  pingAvg?: number;
  pingMax?: number;
  pingLoss?: number;
  dnsResolved?: boolean;
  dnsIp?: string;
}

/**
 * PING — ICMP echo request to a host (domain or IP).
 * Works with both hostnames and direct IP addresses.
 */
export async function pingProbe(service: Service): Promise<PingResult> {
  const host = service.host || service.url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  const start = Date.now();

  try {
    const res = await ping.promise.probe(host, {
      timeout: Math.floor(service.timeout / 1000), // ping uses seconds
      extra: ['-c', '3'], // 3 packets
    });

    const responseTime = Date.now() - start;

    if (!res.alive) {
      return {
        status: 'DOWN',
        responseTime,
        pingLoss: 100,
        error: `Host ${host} is not reachable (ping timeout)`,
      };
    }

    const pingAvg = res.avg !== 'unknown' ? parseFloat(res.avg) : undefined;
    const pingMin = res.min !== 'unknown' ? parseFloat(res.min) : undefined;
    const pingMax = res.max !== 'unknown' ? parseFloat(res.max) : undefined;

    // Calculate packet loss
    const packetLoss = res.packetLoss ? parseFloat(res.packetLoss) : 0;

    let status: 'UP' | 'DEGRADED' | 'DOWN' = 'UP';
    if (packetLoss === 100) {
      status = 'DOWN';
    } else if (packetLoss > 0) {
      status = 'DEGRADED'; // partial packet loss
    }

    return {
      status,
      responseTime: pingAvg ? Math.round(pingAvg) : responseTime,
      pingMin,
      pingAvg,
      pingMax,
      pingLoss: packetLoss,
    };
  } catch (err) {
    const responseTime = Date.now() - start;
    return {
      status: 'DOWN',
      responseTime,
      error: String(err).slice(0, 500),
    };
  }
}

/**
 * DNS — Resolves a domain name and returns the IP.
 * Useful for checking if a domain resolves correctly.
 */
export async function dnsProbe(service: Service): Promise<PingResult> {
  const host = service.host || service.url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  const start = Date.now();

  try {
    const addresses = await dns.resolve4(host);
    const responseTime = Date.now() - start;

    return {
      status: 'UP',
      responseTime,
      dnsResolved: true,
      dnsIp: addresses[0],
    };
  } catch (err) {
    const responseTime = Date.now() - start;
    return {
      status: 'DOWN',
      responseTime,
      dnsResolved: false,
      error: String(err).slice(0, 500),
    };
  }
}
