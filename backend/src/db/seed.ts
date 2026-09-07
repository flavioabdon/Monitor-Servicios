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

  for (const g of groupsData) {
    await prisma.serviceGroup.upsert({
      where: { name: g.name },
      update: {},
      create: g,
    });
  }
  console.log(`[SEED] ${groupsData.length} service groups created`);
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
