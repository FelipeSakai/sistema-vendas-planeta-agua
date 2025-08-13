import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

type AuthResult = {
    token: string;
    user: {
        id: number;
        nome: string;
        email: string;
        cargo: string;
        status: string;
    };
};

export async function autenticar(email: string, senha: string): Promise<AuthResult> {
    if (!email || !senha) {
        throw new Error('email e senha são obrigatórios');
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
        throw new Error('Credenciais inválidas');
    }

    const ok = await bcrypt.compare(senha, usuario.senhaHash);
    if (!ok) {
        throw new Error('Credenciais inválidas');
    }

    try {
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: { ultimoLogin: new Date() },
        });
    } catch (_) {

    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
    }

    const token = jwt.sign(
        { sub: String(usuario.id), role: String(usuario.cargo), nome: usuario.nome },
        secret,
        { expiresIn: '1h' }
    );
    return {
        token,
        user: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            cargo: String(usuario.cargo),
            status: String(usuario.status),
        },
    };
}
