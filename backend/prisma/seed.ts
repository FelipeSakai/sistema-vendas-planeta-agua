// prisma/seed.ts
import { PrismaClient, Cargo, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config(); // carrega .env

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@local';
  const senha = process.env.ADMIN_PASSWORD || 'admin123';
  const nome  = process.env.ADMIN_NAME || 'Administrador';

  const senhaHash = await bcrypt.hash(senha, 12);

  await prisma.usuario.upsert({
    where: { email },
    update: {
      nome,
      cargo: Cargo.ADMIN,
      status: Status.ATIVO,
    },
    create: {
      nome,
      email,
      senhaHash,
      cargo: Cargo.ADMIN,
      status: Status.ATIVO,
    },
  });

  console.log(`✔ Admin garantido: ${email} / ${senha}`);
}

main()
  .catch((e) => {
    console.error('Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
