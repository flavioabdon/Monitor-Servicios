# SEGIP Monitor — Sistema Centralizado de Monitoreo & NOC

Sistema de monitoreo de alta disponibilidad diseñado para infraestructura y servicios gubernamentales del **SEGIP** (páginas institucionales, sistemas web, APIs REST JSON, Web Services SOAP con validación WSDL, verificación lógica de Logins, Ping ICMP por IP/Dominio, certificados SSL y diagnóstico asistido por IA Local con Ollama).

---

## Características Principales

1. **Motor de Sondeo Inteligente (Probes)**:
   - **Web Institucional**: Verifica disponibilidad HTTP (2xx) y tiempos de respuesta.
   - **Sistema Web**: Valida que la aplicación responda con palabras clave esperadas en el HTML.
   - **APIs REST / JSON**: Valida código HTTP y estructura del payload JSON con configurador Postman.
   - **SOAP / WSDL**: Comprueba la lectura de definiciones `?wsdl` y esquemas XML.
   - **SOAP Operación**: Envía envelopes XML específicos y analiza SOAP Faults.
   - **Login Check**: Detecta respuestas engañosas (ej. HTTP 200 pero con body `{"error": "credenciales inválidas"}`).
   - **Ping / ICMP**: Monitorea servicios por IP directa o dominio con métricas de latencia RTT y pérdida de paquetes.
   - **Certificados SSL**: Inspecciona vigencia y alerta antes de su expiración.

2. **Modo TV / Sala de Operaciones (NOC)** (`/tv`):
   - Pantalla completa optimizada para televisores y pantallas de monitoreo 24/7.
   - Gráficos interactivos de respuesta en tiempo real dentro de cada tarjeta de servicio.
   - Filtro global de tiempo por intervalos preestablecidos y rangos por fecha personalizados.
   - Acceso público sin credenciales para pantallas dedicadas.
   - Actualizaciones en tiempo real por WebSockets (Socket.IO).
   - Indicadores de estado, latencia en vivo y reloj digital institucional.

3. **Diagnóstico con IA Local (Ollama)**:
   - Análisis de incidentes y fallos técnicos con modelos locales (`llama3`, `mistral`, `deepseek-r1`, `qwen2.5`) sin enviar datos confidenciales fuera del servidor.
   - Generación de resúmenes ejecutivos diarios automáticos.

4. **Notificaciones Multicanal**:
   - **Telegram Bot**: Alertas inmediatas cuando un servicio cae o se degrada, con notificación de recuperación automática.
   - **Correo Electrónico (SMTP)**: Reportes y alertas en HTML con tablas de disponibilidad y métricas de latencia.

---

## Estructura del Repositorio

```
segip-monitor/
├── docker-compose.yml           # Orquestación con PostgreSQL, Backend, Frontend y Ollama
├── backend/
│   ├── prisma/                  # Esquema Prisma y migraciones PostgreSQL
│   └── src/
│       ├── api/                 # Endpoints REST (auth, services, checks, stats, config)
│       ├── db/                  # Cliente Prisma y Seed
│       ├── notifiers/           # Módulos de Telegram y Email (Nodemailer)
│       ├── probes/              # Sondas (HTTP, REST JSON, SOAP, Login, Ping ICMP, SSL)
│       ├── scheduler/           # Tareas programadas con node-cron
│       └── services/            # Integración con Ollama IA
└── frontend/                    # Panel web y Modo TV en Next.js (TailwindCSS)
    └── src/
        ├── app/
        │   ├── dashboard/       # Dashboard principal de gestión
        │   ├── login/           # Autenticación segura
        │   └── tv/              # Modo TV para salas de operaciones NOC
        └── components/          # Componentes reutilizables institucionales
```

---

## Puesta en Marcha Rápida (Docker)

```bash
# 1. Clonar o ingresar al directorio del proyecto
cd segip-monitor

# 2. Configurar variables de entorno (opcional, tiene valores por defecto)
cp .env.example .env

# 3. Levantar todos los servicios con Docker Compose
docker compose up -d

# 4. Inicializar usuario administrador y grupos base
docker compose exec backend npm run db:seed
```

Los datos de PostgreSQL se almacenan en el volumen persistente `pgdata`, montado
en `/var/lib/postgresql/data`. Puedes reiniciar o recrear los contenedores sin
perder registros:

```bash
docker compose down
docker compose up -d
```

No uses `docker compose down -v`, porque elimina el volumen y todos los datos
de la base de datos.

---

## Accesos del Sistema

- **Dashboard Principal**: [http://localhost:3000](http://localhost:3000)
- **Modo Pantalla TV (NOC)**: [http://localhost:3000/tv](http://localhost:3000/tv)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Ollama IA**: [http://localhost:11434](http://localhost:11434)

**Credenciales iniciales**:
- Usuario: `admin`
- Contraseña: `adminpassword123`

---

## Ejecución en Modo Desarrollo (Sin Docker)
```bash
cd /Users/flavioabdon/SEGIP/segip-monitor
docker compose up --build -d
El sistema se conectará automáticamente a tu instalación local de Ollama en `http://localhost:11434`. Solo asegúrate de tener tu modelo descargado en tu terminal:
```bash
ollama pull llama3
```

---

## Accesos del Sistema

- **Panel de Administración**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
  - **Usuario**: `admin`
  - **Contraseña**: `Admin1234!`
- **Modo TV Sala de Operaciones**: [http://localhost:3000/tv](http://localhost:3000/tv) *(Sin login)*
- **API Backend & Healthcheck**: [http://localhost:3001/health](http://localhost:3001/health)

---

## Ejecución en Modo Desarrollo (Sin Docker)

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
