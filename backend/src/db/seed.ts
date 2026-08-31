import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('[SEED] Seeding database...');

  // 1. Create Default Admin User
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash },
    create: {
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash,
    },
  });
  console.log('[SEED] Admin user created');

  // 2. Create Service Groups
  const groupsData = [
    { name: 'Portales Ciudadanos', description: 'Portales web de acceso público y trámites', color: '#3b82f6' },
    { name: 'Sistemas Internos', description: 'Aplicaciones de gestión operativa y validación', color: '#10b981' },
    { name: 'APIs e Integraciones', description: 'Servicios REST y SOAP de interoperabilidad', color: '#8b5cf6' },
    { name: 'Infraestructura Crítica', description: 'Servidores DNS, base de datos y pasarelas', color: '#f59e0b' },
  ];

  const groups = [];
  for (const g of groupsData) {
    const group = await prisma.serviceGroup.upsert({
      where: { name: g.name },
      update: {},
      create: g,
    });
    groups.push(group);
  }
  console.log(`[SEED] ${groups.length} service groups created`);

  // 3. Create Sample Services
  const sampleServices = [
    {
      id: 'sample-web-001',
      name: 'Google (Ejemplo)',
      description: 'Servicio de ejemplo - página institucional',
      type: 'WEB_INSTITUCIONAL' as const,
      url: 'https://www.google.com',
      method: 'GET',
      interval: 30,
      timeout: 5000,
      expectedHttpCode: 200,
      groupId: groups[0].id,
      notifyTelegram: false,
      notifyEmail: false,
    },
    {
      id: 'sample-api-001',
      name: 'JSONPlaceholder API',
      description: 'API de pruebas REST pública',
      type: 'API_JSON' as const,
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET',
      interval: 45,
      timeout: 8000,
      expectedHttpCode: 200,
      expectedKeyword: 'userId',
      groupId: groups[2].id,
      notifyTelegram: false,
      notifyEmail: false,
    },
    {
      id: 'sample-dns-001',
      name: 'Cloudflare DNS (1.1.1.1)',
      description: 'Verificación de resolución DNS pública',
      type: 'DNS' as const,
      url: '1.1.1.1',
      host: '1.1.1.1',
      interval: 60,
      timeout: 3000,
      groupId: groups[3].id,
      notifyTelegram: false,
      notifyEmail: false,
    },
    {
      id: 'sample-ssl-001',
      name: 'Certificado SSL Github',
      description: 'Monitoreo de expiración de certificado SSL',
      type: 'SSL_CERT' as const,
      url: 'https://github.com',
      host: 'github.com',
      interval: 3600,
      timeout: 10000,
      sslAlertDaysBefore: 30,
      groupId: groups[3].id,
      notifyTelegram: false,
      notifyEmail: false,
    },
  ];

  for (const svc of sampleServices) {
    await prisma.service.upsert({
      where: { id: svc.id },
      update: {},
      create: svc,
    });
  }
  console.log('[SEED] Sample services created');
  console.log('\n[SEED] Complete!');
  console.log('\n[CREDENTIALS] Admin credentials:');
  console.log(`   Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
  console.log(`   Password: ${adminPassword}`);
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
