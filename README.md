# 🛡️ SEGIP Monitor — Sistema Centralizado de Monitoreo & NOC

Sistema de monitoreo de alta disponibilidad diseñado para infraestructura y servicios gubernamentales del **SEGIP** (páginas institucionales, sistemas web, APIs REST JSON, Web Services SOAP con validación WSDL, verificación lógica de Logins, Ping ICMP por IP/Dominio, certificados SSL y diagnóstico asistido por IA Local con Ollama).

---

## 🚀 Características Principales

1. **🔍 Motor de Sondeo Inteligente (Probes)**:
   - **Web Institucional**: Verifica disponibilidad HTTP (2xx) y tiempos de respuesta.
   - **Sistema Web**: Valida que la aplicación responda con palabras clave esperadas en el HTML.
   - **APIs REST / JSON**: Valida código HTTP y estructura del payload JSON.
   - **SOAP / WSDL**: Comprueba la lectura de definiciones `?wsdl` y esquemas XML.
   - **SOAP Operación**: Envía envelopes XML específicos y analiza SOAP Faults.
   - **Login Check**: Detecta respuestas engañosas (ej. HTTP 200 pero con body `{"error": "credenciales inválidas"}`).
   - **Ping / ICMP**: Monitorea servicios por IP directa o dominio con métricas de latencia RTT y pérdida de paquetes.
   - **Certificados SSL**: Inspecciona vigencia y alerta antes de su expiración.

2. **📺 Modo TV / Sala de Operaciones (NOC)** (`/tv`):
   - Pantalla completa optimizada para televisores y pantallas de monitoreo 24/7.
   - Acceso público sin credenciales para pantallas dedicadas.
   - Actualizaciones en tiempo real por WebSockets (Socket.IO).
   - Indicadores luminosos de estado, latencia en vivo y reloj digital institucional.

3. **🤖 Diagnóstico con IA Local (Ollama)**:
   - Análisis de incidentes y fallos técnicos con modelos locales (`llama3`, `mistral`, `deepseek-r1`, `qwen2.5`) sin enviar datos confidenciales fuera del servidor.
   - Generación de resúmenes ejecutivos diarios automáticos.

4. **🔔 Notificaciones Multicanal**:
   - **Telegram Bot**: Alertas inmediatas cuando un servicio cae o se degrada, con notificación de recuperación automática.
   - **Correo Electrónico (SMTP)**: Reportes diarios en HTML con tablas de disponibilidad y métricas de latencia.

---

## 📂 Estructura del Repositorio

```
segip-monitor/
├── docker-compose.yml           # Orquestación con PostgreSQL, Backend, Frontend y Ollama
├── backend/
│   ├── src/
│   │   ├── api/routes/          # Endpoints REST (auth, services, checks, alerts, stats)
│   │   ├── probes/              # Motores de check (HTTP, SOAP, Login, Ping, SSL)
│   │   ├── scheduler/           # Planificador cron de sondeos periódicos
│   │   ├── notifiers/           # Bot de Telegram y despachador de correos
│   │   ├── services/            # Integración con Ollama Local AI
│   │   ├── db/                  # Cliente Prisma y script de Seed
│   │   └── index.ts             # Servidor Express + WebSockets
│   ├── prisma/schema.prisma     # Modelos de Base de Datos PostgreSQL
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── dashboard/       # Panel Administrativo con CRUD y filtros
    │   │   ├── tv/              # Modo TV para Sala de Operaciones
    │   │   └── login/           # Autenticación de Admin
    │   └── lib/api.ts           # Cliente API tipado
    └── Dockerfile
```

---

## ⚡ Puesta en Marcha Rápida (Docker)

### 1. Clonar y configurar variables de entorno
Crea un archivo `.env` en la raíz de `segip-monitor/backend/` o edita el `.env.example`:

```bash
# Telegram Bot (Opcional)
TELEGRAM_BOT_TOKEN="tu_token_aqui"
TELEGRAM_CHAT_ID="tu_chat_id_aqui"

# Email SMTP (Opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu_correo@gmail.com"
SMTP_PASS="tu_contraseña_de_aplicacion"
ALERT_EMAIL_TO="administrador@segip.gob.bo"
```

### 2. Levantar los servicios con Docker
```bash
cd /Users/flavioabdon/SEGIP/segip-monitor
docker compose up --build -d
```

### 3. Ollama Local (IA en tu equipo)
El sistema se conectará automáticamente a tu instalación local de Ollama en `http://localhost:11434`. Solo asegúrate de tener tu modelo descargado en tu terminal:
```bash
ollama pull llama3
```

---

## 🌐 Accesos del Sistema

- **Panel de Administración**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
  - **Usuario**: `admin`
  - **Contraseña**: `Admin1234!`
- **Modo TV Sala de Operaciones**: [http://localhost:3000/tv](http://localhost:3000/tv) *(Sin login)*
- **API Backend & Healthcheck**: [http://localhost:3001/health](http://localhost:3001/health)

---

## 💻 Ejecución en Modo Desarrollo (Sin Docker)

### Backend:
```bash
cd segip-monitor/backend
npm install
npx prisma db push
npm run db:seed
npm run dev
```

### Frontend:
```bash
cd segip-monitor/frontend
npm install
npm run dev
```
