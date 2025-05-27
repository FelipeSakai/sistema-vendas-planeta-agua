import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';


export const criarUsuario = async (dados: {
    nome: string,
    email: string,
    senha: string,
    cargo: string
}) => {
    const usuarioExistente = await prisma.usuario.findUnique({
        where: { email: dados.email }
    });

    if (usuarioExistente) {
        throw new Error('Usuário já existe com esse e-mail');
    }

    const senhaHash = await bcrypt.hash(dados.senha, 10);

    const novoUsuario = await prisma.usuario.create({
        data: {
            nome: dados.nome,
            email: dados.email,
            senha: senhaHash,
            cargo: dados.cargo
        }
    });

    return {
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        cargo: novoUsuario.cargo
    };
}

export const listarUsuarios = async () => {
    return await prisma.usuario.findMany({
        select: {
            id: true,
            nome: true,
            email: true,
            cargo: true,
            criadoEm: true
        }
    });
}

export const buscarUsuarioPorId = async (id: string) => {
    const usuario = await prisma.usuario.findUnique({
        where: { id: Number(id) },
        select: {
            id: true,
            nome: true,
            email: true,
            cargo: true,
            criadoEm: true
        }
    });

    if (!usuario) throw new Error('Usuário não encontrado');

    return usuario;
}

export const atualizarUsuarios = async (id: string, dados: {
    nome?: string;
    email?: string;
    senha?: string;
    cargo?: string;
}) => {
    const usuarioExistente = await prisma.usuario.findUnique({
        where: { id: Number(id) }
    });

    if (!usuarioExistente) throw new Error('Usuário não encontrado');

    const dadosAtualizados = { ...dados };

    if (dados.senha) {
        dadosAtualizados.senha = await bcrypt.hash(dados.senha, 10);
    }

    await prisma.usuario.update({
        where: { id: Number(id) },
        data: dadosAtualizados
    });

    return { mensagem: 'Usuario atualizado com sucesso' };
}

export const excluirUsuario = async (id: string) => {
    const usuarioExistente = await prisma.usuario.findUnique({
        where: { id: Number(id) }
    });
    if (!usuarioExistente) throw new Error('Usuário não encontrado');

    await prisma.usuario.delete({
        where: { id: Number(id) }
    });

    return { mensagem: 'Usuário excluído com sucesso' };
}
