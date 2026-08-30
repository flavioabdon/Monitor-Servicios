import axios, { AxiosError } from 'axios';
import { Service, CheckStatus } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ProbeResult {
  status: CheckStatus;
  httpCode?: number;
  responseTime?: number;
  responseSize?: number;
  bodySnippet?: string;
  error?: string;
}

/**
 * WEB_INSTITUCIONAL — Simple HTTP check.
 * Verifies that the page returns a 2xx status code within the timeout.
 */
export async function webInstitucionalProbe(service: Service): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await axios.get(service.url, {
      timeout: service.timeout,
      maxRedirects: service.followRedirects ? 5 : 0,
      validateStatus: () => true, // don't throw on non-2xx
      headers: (service.headers as Record<string, string>) || {},
      responseType: 'text',
    });

    const responseTime = Date.now() - start;
    const httpCode = res.status;
    const body = String(res.data || '');
    const responseSize = Buffer.byteLength(body, 'utf8');
    const bodySnippet = body.slice(0, 500);
    const expectedCode = service.expectedHttpCode ?? 200;

    let status: CheckStatus = 'UP';
    if (httpCode < 200 || httpCode >= 400) {
      status = 'DOWN';
    } else if (service.expectedKeyword && !body.includes(service.expectedKeyword)) {
      status = 'DEGRADED';
    } else if (service.unexpectedKeyword && body.includes(service.unexpectedKeyword)) {
      status = 'DEGRADED';
    } else if (httpCode !== expectedCode && expectedCode !== 200) {
      status = 'DEGRADED';
    }

    return { status, httpCode, responseTime, responseSize, bodySnippet };
  } catch (err) {
    const responseTime = Date.now() - start;
    const error = err instanceof AxiosError ? err.message : String(err);
    const isTimeout = err instanceof AxiosError && err.code === 'ECONNABORTED';
    return {
      status: isTimeout ? 'TIMEOUT' : 'DOWN',
      responseTime,
      error: error.slice(0, 500),
    };
  }
}

/**
 * SISTEMA_WEB — HTTP check with mandatory keyword validation.
 * Verifies the system responds AND contains the expected keyword.
 */
export async function sistemaWebProbe(service: Service): Promise<ProbeResult> {
  // Same logic as web institucional but keyword check is mandatory
  const result = await webInstitucionalProbe(service);
  // If UP but no keyword configured, mark as DEGRADED with a note
  if (result.status === 'UP' && !service.expectedKeyword) {
    logger.warn(`Service ${service.id} (SISTEMA_WEB) has no expectedKeyword configured`);
  }
  return result;
}

/**
 * API_JSON — REST API check with JSON body validation.
 */
export async function apiJsonProbe(service: Service): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await axios({
      method: (service.method as any) || 'GET',
      url: service.url,
      timeout: service.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...((service.headers as Record<string, string>) || {}),
      },
      data: service.body ? JSON.parse(service.body) : undefined,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - start;
    const httpCode = res.status;
    const body =
      typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const responseSize = Buffer.byteLength(body, 'utf8');
    const bodySnippet = body.slice(0, 500);

    let status: CheckStatus = 'UP';
    if (httpCode < 200 || httpCode >= 400) {
      status = 'DOWN';
    } else {
      // Validate JSON parseable
      try {
        const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        // Check keyword presence
        if (service.expectedKeyword && !body.includes(service.expectedKeyword)) {
          status = 'DEGRADED';
        } else if (service.unexpectedKeyword && body.includes(service.unexpectedKeyword)) {
          status = 'DEGRADED';
        }
      } catch {
        status = 'DEGRADED'; // Not valid JSON
      }
    }

    return { status, httpCode, responseTime, responseSize, bodySnippet };
  } catch (err) {
    const responseTime = Date.now() - start;
    const error = err instanceof AxiosError ? err.message : String(err);
    const isTimeout = err instanceof AxiosError && err.code === 'ECONNABORTED';
    return {
      status: isTimeout ? 'TIMEOUT' : 'DOWN',
      responseTime,
      error: error.slice(0, 500),
    };
  }
}
