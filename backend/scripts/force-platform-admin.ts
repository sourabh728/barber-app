/**
 * One-shot: delete customer/barber identity for PLATFORM_ADMIN_EMAIL and recreate as ADMIN.
 * Usage: npx ts-node --transpile-only scripts/force-platform-admin.ts
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/enums';
import {
  PLATFORM_ADMIN_EMAIL,
  PLATFORM_ADMIN_NAME,
  PLATFORM_ADMIN_PASSWORD,
} from '../src/admin/admin.constants';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });
  const email = PLATFORM_ADMIN_EMAIL;
  const hashedPassword = await bcrypt.hash(PLATFORM_ADMIN_PASSWORD, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Found user ${email} role=${existing.role} id=${existing.id}`);
    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId: existing.id } });
      await tx.appointment.deleteMany({ where: { customerId: existing.id } });
      await tx.shop.deleteMany({ where: { ownerId: existing.id } });
      await tx.user.delete({ where: { id: existing.id } });
    });
    console.log('Deleted previous user and related data.');
  } else {
    console.log('No existing user — creating admin.');
  }

  const admin = await prisma.user.create({
    data: {
      name: PLATFORM_ADMIN_NAME,
      email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`Admin ready: ${admin.email} role=${admin.role}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
