import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash,
    },
  });
  console.log('✅ Admin user created');

  // Create default service groups
  const groups = await Promise.all([
    prisma.serviceGroup.upsert({
      where: { name: 'Portales Web' },
      update: {},
      create: { name: 'Portales Web', description: 'Páginas institucionales', color: '#6366f1' },
    }),
    prisma.serviceGroup.upsert({
      where: { name: 'APIs REST' },
      update: {},
      create: { name: 'APIs REST', description: 'Servicios REST/JSON', color: '#10b981' },
    }),
    prisma.serviceGroup.upsert({
      where: { name: 'Servicios SOAP' },
      update: {},
      create: { name: 'Servicios SOAP', description: 'Web Services SOAP/XML', color: '#f59e0b' },
    }),
    prisma.serviceGroup.upsert({
      where: { name: 'Autenticación' },
      update: {},
      create: { name: 'Autenticación', description: 'Servicios de login y auth', color: '#ef4444' },
    }),
    prisma.serviceGroup.upsert({
      where: { name: 'Infraestructura' },
      update: {},
      create: { name: 'Infraestructura', description: 'Servidores y red', color: '#8b5cf6' },
    }),
  ]);
  console.log(`✅ ${groups.length} service groups created`);

  // Create sample services for testing
  const portalGroup = groups[0];
  const apiGroup = groups[1];
  const soapGroup = groups[2];
  const infraGroup = groups[4];

  await prisma.service.upsert({
    where: { id: 'sample-web-001' },
    update: {},
    create: {
      id: 'sample-web-001',
      name: 'Google (Ejemplo)',
      description: 'Servicio de ejemplo - página institucional',
      type: 'WEB_INSTITUCIONAL',
      url: 'https://www.google.com',
      method: 'GET',
      interval: 60,
      timeout: 10000,
      groupId: portalGroup.id,
    },
  });

  await prisma.service.upsert({
    where: { id: 'sample-api-001' },
    update: {},
    create: {
      id: 'sample-api-001',
      name: 'JSONPlaceholder API (Ejemplo)',
      description: 'API REST de ejemplo',
      type: 'API_JSON',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET',
      expectedKeyword: '"userId"',
      interval: 60,
      timeout: 10000,
      groupId: apiGroup.id,
    },
  });

  await prisma.service.upsert({
    where: { id: 'sample-soap-001' },
    update: {},
    create: {
      id: 'sample-soap-001',
      name: 'Calculator SOAP (Ejemplo)',
      description: 'SOAP service de ejemplo - verifica WSDL',
      type: 'SOAP_WSDL',
      url: 'https://www.dneonline.com/calculator.asmx?wsdl',
      method: 'GET',
      interval: 120,
      timeout: 15000,
      groupId: soapGroup.id,
    },
  });

  await prisma.service.upsert({
    where: { id: 'sample-ping-001' },
    update: {},
    create: {
      id: 'sample-ping-001',
      name: 'Google DNS (Ejemplo Ping)',
      description: 'Ping a 8.8.8.8',
      type: 'PING',
      url: '8.8.8.8',
      host: '8.8.8.8',
      interval: 30,
      timeout: 5000,
      groupId: infraGroup.id,
    },
  });

  console.log('✅ Sample services created');
  console.log('\n🎉 Seed complete!');
  console.log(`\n📋 Admin credentials:`);
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
