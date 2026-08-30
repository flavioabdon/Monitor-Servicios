import axios, { AxiosError } from 'axios';
import { Service, CheckStatus } from '@prisma/client';
import { ProbeResult } from './httpProbe';

/**
 * LOGIN_CHECK — Posts credentials to a login endpoint and evaluates
 * the response LOGICALLY, not just the HTTP status code.
 *
 * Rules:
 *   HTTP 200 + loginSuccessField present in body → UP
 *   HTTP 200 + loginFailureKeyword in body       → DEGRADED (service up, auth fails)
 *   HTTP 200 + neither                           → UP (generic 200 check)
 *   HTTP 4xx/5xx                                 → DOWN
 *   Timeout                                      → TIMEOUT
 */
export async function loginCheckProbe(service: Service): Promise<ProbeResult> {
  const start = Date.now();

  let requestBody: any = undefined;
  if (service.body) {
    try {
      requestBody = JSON.parse(service.body);
    } catch {
      requestBody = service.body; // send as-is if not JSON
    }
  }

  try {
    const res = await axios({
      method: (service.method as any) || 'POST',
      url: service.url,
      timeout: service.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...((service.headers as Record<string, string>) || {}),
      },
      data: requestBody,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - start;
    const httpCode = res.status;
    const body =
      typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const responseSize = Buffer.byteLength(body, 'utf8');
    const bodySnippet = body.slice(0, 500);

    // ── HTTP failure ──────────────────────────────
    if (httpCode < 200 || httpCode >= 400) {
      return {
        status: 'DOWN',
        httpCode,
        responseTime,
        responseSize,
        bodySnippet,
        error: `HTTP ${httpCode}`,
      };
    }

    // ── Logical evaluation ────────────────────────
    let status: CheckStatus = 'UP';
    let error: string | undefined = undefined;

    // 1. If a failure keyword is configured and found in body → DEGRADED
    if (service.loginFailureKeyword && body.toLowerCase().includes(service.loginFailureKeyword.toLowerCase())) {
      status = 'DEGRADED';
      error = `Login returned HTTP ${httpCode} but body contains failure keyword: "${service.loginFailureKeyword}"`;
    }
    // 2. If a success field is configured and NOT found → DEGRADED
    else if (service.loginSuccessField) {
      const fieldPresent = body.toLowerCase().includes(service.loginSuccessField.toLowerCase());
      if (!fieldPresent) {
        status = 'DEGRADED';
        error = `Login returned HTTP ${httpCode} but success field "${service.loginSuccessField}" not found in body`;
      }
      // 3. If success value also configured, check it
      else if (service.loginSuccessValue) {
        const valuePresent = body.includes(service.loginSuccessValue);
        if (!valuePresent) {
          status = 'DEGRADED';
          error = `Field "${service.loginSuccessField}" present but value "${service.loginSuccessValue}" not found`;
        }
      }
    }

    return { status, httpCode, responseTime, responseSize, bodySnippet, error };
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
