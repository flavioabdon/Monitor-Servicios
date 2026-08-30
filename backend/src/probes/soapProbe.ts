import axios, { AxiosError } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { Service, CheckStatus } from '@prisma/client';
import { ProbeResult } from './httpProbe';

const xmlParser = new XMLParser({ ignoreAttributes: false });

/**
 * SOAP_WSDL — Fetches the WSDL document and validates it is well-formed XML.
 * This is the primary check to confirm a SOAP service is alive.
 */
export async function soapWsdlProbe(service: Service): Promise<ProbeResult> {
  const start = Date.now();
  // Ensure URL ends with ?wsdl
  const wsdlUrl = service.url.includes('?wsdl') || service.url.includes('?WSDL')
    ? service.url
    : `${service.url}?wsdl`;

  try {
    const res = await axios.get(wsdlUrl, {
      timeout: service.timeout,
      headers: {
        Accept: 'text/xml,application/xml,application/wsdl+xml,*/*',
        ...((service.headers as Record<string, string>) || {}),
      },
      responseType: 'text',
      validateStatus: () => true,
    });

    const responseTime = Date.now() - start;
    const httpCode = res.status;
    const body = String(res.data || '');
    const responseSize = Buffer.byteLength(body, 'utf8');
    const bodySnippet = body.slice(0, 500);

    if (httpCode < 200 || httpCode >= 400) {
      return { status: 'DOWN', httpCode, responseTime, bodySnippet, error: `HTTP ${httpCode}` };
    }

    // Validate it looks like a WSDL/XML
    if (!body.includes('<') || !body.includes('>')) {
      return {
        status: 'DEGRADED',
        httpCode,
        responseTime,
        responseSize,
        bodySnippet,
        error: 'Response is not XML',
      };
    }

    try {
      xmlParser.parse(body);
    } catch (xmlErr) {
      return {
        status: 'DEGRADED',
        httpCode,
        responseTime,
        responseSize,
        bodySnippet,
        error: `Invalid XML: ${String(xmlErr).slice(0, 200)}`,
      };
    }

    // Check for WSDL definitions tag
    const hasWsdlDefs =
      body.includes('wsdl:definitions') ||
      body.includes('definitions xmlns') ||
      body.includes('<definitions');

    return {
      status: hasWsdlDefs ? 'UP' : 'DEGRADED',
      httpCode,
      responseTime,
      responseSize,
      bodySnippet,
      error: hasWsdlDefs ? undefined : 'XML valid but no WSDL definitions found',
    };
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
 * SOAP_OPERACION — Sends a SOAP envelope and validates the response.
 */
export async function soapOperacionProbe(service: Service): Promise<ProbeResult> {
  const start = Date.now();

  if (!service.soapEnvelope) {
    return { status: 'UNKNOWN', error: 'No SOAP envelope configured' };
  }

  try {
    const res = await axios.post(service.url, service.soapEnvelope, {
      timeout: service.timeout,
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        SOAPAction: service.soapAction || '""',
        ...((service.headers as Record<string, string>) || {}),
      },
      responseType: 'text',
      validateStatus: () => true,
    });

    const responseTime = Date.now() - start;
    const httpCode = res.status;
    const body = String(res.data || '');
    const responseSize = Buffer.byteLength(body, 'utf8');
    const bodySnippet = body.slice(0, 500);

    if (httpCode < 200 || httpCode >= 400) {
      return { status: 'DOWN', httpCode, responseTime, responseSize, bodySnippet, error: `HTTP ${httpCode}` };
    }

    // Check for SOAP fault
    if (body.includes('<faultcode>') || body.includes('<soap:Fault>') || body.includes('<s:Fault>')) {
      const faultMatch = body.match(/<faultstring[^>]*>(.*?)<\/faultstring>/is);
      return {
        status: 'DEGRADED',
        httpCode,
        responseTime,
        responseSize,
        bodySnippet,
        error: faultMatch ? `SOAP Fault: ${faultMatch[1]}` : 'SOAP Fault in response',
      };
    }

    // Validate keyword if configured
    let status: CheckStatus = 'UP';
    if (service.expectedKeyword && !body.includes(service.expectedKeyword)) {
      status = 'DEGRADED';
    } else if (service.unexpectedKeyword && body.includes(service.unexpectedKeyword)) {
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
