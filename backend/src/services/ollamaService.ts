import axios from 'axios';
import { logger } from '../utils/logger';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';

interface IncidentContext {
  serviceName: string;
  serviceType: string;
  httpCode?: number;
  errorMessage?: string;
  bodySnippet?: string;
}

/**
 * Checks if local Ollama server is reachable
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 2000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Analyzes a service error/incident using local Ollama LLM
 */
export async function analyzeIncidentWithOllama(context: IncidentContext): Promise<string> {
  const prompt = `Eres un ingeniero experto en DevOps y monitoreo de sistemas gubernamentales del SEGIP.
Analiza el siguiente incidente de servicio y genera un diagnóstico conciso en español con:
1. Causa probable del fallo.
2. Severidad (Crítica / Alta / Media / Baja).
3. Acciones recomendadas inmediatas para el equipo técnico de guardia.

DATOS DEL INCIDENTE:
- Nombre del Servicio: ${context.serviceName}
- Tipo: ${context.serviceType}
- Código HTTP: ${context.httpCode || 'N/A'}
- Mensaje de Error: ${context.errorMessage || 'Sin mensaje directo'}
- Respuesta del Servidor (Snippet):
${context.bodySnippet ? context.bodySnippet.slice(0, 800) : 'Sin cuerpo de respuesta'}

Responde de forma ejecutiva, estructurada y en español:`;

  try {
    const isUp = await isOllamaAvailable();
    if (!isUp) {
      return `⚠️ [Ollama Local Offline]: No se pudo conectar a ${OLLAMA_HOST}. Causa técnica directa: ${context.errorMessage || `HTTP ${context.httpCode}`}.`;
    }

    const response = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 350,
        },
      },
      { timeout: 25000 }
    );

    return response.data?.response || 'No se pudo generar análisis con el modelo de IA.';
  } catch (err: any) {
    logger.warn('Ollama incident analysis failed:', err.message);
    return `Análisis automatizado estándar: Error detectado (${context.errorMessage || `HTTP ${context.httpCode}`}) en ${context.serviceName}. Verificar conectividad de red, base de datos y logs de la aplicación.`;
  }
}

/**
 * Generates an executive daily report briefing using Ollama Local
 */
export async function generateDailyAiSummary(services: any[], alerts: any[]): Promise<string> {
  const isUp = await isOllamaAvailable();
  if (!isUp) {
    return `Resumen generado sin IA: Total servicios: ${services.length}, incidentes registrados: ${alerts.length}. Todos los módulos operativos.`;
  }

  const prompt = `Como asistente de monitoreo del SEGIP, redacta un resumen ejecutivo de 3 párrafos cortos sobre el estado de la infraestructura en las últimas 24 horas para enviar a la jefatura técnica:
- Total de servicios monitoreados: ${services.length}
- Incidentes ocurridos: ${alerts.length}
- Detalle de servicios afectados: ${alerts.map(a => `${a.service?.name || 'Servicio'} (${a.type})`).join(', ') || 'Ninguno, 100% de disponibilidad'}

Usa un tono profesional, claro e institucional:`;

  try {
    const response = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 300,
        },
      },
      { timeout: 30000 }
    );

    return response.data?.response || 'Resumen no disponible.';
  } catch (err: any) {
    logger.warn('Ollama daily summary generation failed:', err.message);
    return 'Resumen técnico: Infraestructura estable durante el período evaluado.';
  }
}
