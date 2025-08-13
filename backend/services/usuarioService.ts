import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { Cargo, Status } from '@prisma/client';

const toId = (id: string) => {
    const n = Number(id);
    if (!Number.isInteger(n)) throw new Error('ID inválido');
    return n;
};

export const criarUsuario = async (dados: {
    nome: string,
    email: string,
    senha: string,
    cargo: Cargo
}) => {
    const senhaHash = await bcrypt.hash(dados.senha, 10);

    try {
        const novoUsuario = await prisma.usuario.create({
            data: {
                nome: dados.nome,
                email: dados.email,
                senhaHash: senhaHash,
                cargo: dados.cargo
            },
            select: {
                id: true, nome: true, email: true, cargo: true
            }
        });
        return novoUsuario;
    } catch (e: any) {
        if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
            throw new Error('Usuário já existe com esse e-mail');
        }
        throw e;
    }
};

export const listarUsuarios = async () => {
    return await prisma.usuario.findMany({
        select: {
            id: true,
            nome: true,
            email: true,
            cargo: true,
            status: true,
            criadoEm: true,
            atualizadoEm: true,
            ultimoLogin: true
        }
    });
}

export const buscarUsuarioPorId = async (id: string) => {
    const userId = toId(id); // <—
    const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        select: {
            id: true, nome: true, email: true, cargo: true,
            status: true, criadoEm: true, atualizadoEm: true
        }
    });
    if (!usuario) throw new Error('Usuário não encontrado');
    return usuario;
};


export const atualizarUsuarios = async (
    id: string,
    dados: { nome?: string; email?: string; senha?: string; cargo?: string | Cargo; status?: string | Status }
) => {
    const userId = toId(id);

    const atual = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!atual) throw new Error('Usuário não encontrado');

    if (dados.email && dados.email !== atual.email) {
        const jaExiste = await prisma.usuario.findUnique({ where: { email: dados.email } });
        if (jaExiste) throw new Error('Usuário já existe com esse e-mail');
    }

    const data: any = {
        nome: dados.nome,
        email: dados.email,
    };

    if (dados.cargo) {
        const c = dados.cargo.toString().toUpperCase();
        data.cargo = (Cargo as any)[c] ?? atual.cargo;
    }
    if (dados.status) {
        const s = dados.status.toString().toUpperCase();
        data.status = (Status as any)[s] ?? atual.status;
    }
    if (dados.senha) {
        data.senhaHash = await bcrypt.hash(dados.senha, 12); 
    }

    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    await prisma.usuario.update({ where: { id: userId }, data });
    return { mensagem: 'Usuario atualizado com sucesso' };
};

export const excluirUsuario = async (id: string) => {
    const userId = toId(id);
    const usuarioExistente = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuarioExistente) throw new Error('Usuário não encontrado');

    await prisma.usuario.delete({ where: { id: userId } });
    return { mensagem: 'Usuário excluído com sucesso' };
};
