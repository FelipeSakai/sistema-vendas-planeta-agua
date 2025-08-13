// src/server.ts
import dotenv from 'dotenv';
import app from './app';
import { PrismaClient, Cargo, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

const prisma = new PrismaClient();

async function ensureAdmin() {
    const email = process.env.ADMIN_EMAIL || 'admin@local';
    const senha = process.env.ADMIN_PASSWORD || 'admin123';
    const nome = process.env.ADMIN_NAME || 'Administrador';

    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (!existing) {
        const senhaHash = await bcrypt.hash(senha, 12);
        await prisma.usuario.create({
            data: { nome, email, senhaHash, cargo: Cargo.ADMIN, status: Status.ATIVO },
        });
        console.log(`✔ Admin criado: ${email} / ${senha}`);
    } else if (existing.cargo !== Cargo.ADMIN) {
        await prisma.usuario.update({
            where: { email },
            data: { cargo: Cargo.ADMIN, status: Status.ATIVO },
        });
        console.log(`✔ Admin promovido: ${email}`);
    }
}

const PORT = process.env.PORT || 3333;

async function startServer() {
    await ensureAdmin();
    app.listen(PORT, () => {
        console.log(`Servidor rodando em: http://localhost:${PORT}`);
    });
}

startServer().catch((err) => {
    console.error('Erro ao iniciar servidor:', err);
    process.exit(1);
});
