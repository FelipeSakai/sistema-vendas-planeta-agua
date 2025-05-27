import * as usuarioService from '../../services/usuarioService';
import bcrypt from 'bcryptjs';


jest.mock('../../lib/prisma', () => ({
  prisma: {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));

const { prisma } = require('../../lib/prisma');

describe('usuarioService.criarUsuario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar usuário com senha criptografada', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.usuario.create as jest.Mock).mockResolvedValue({
      id: 1,
      nome: 'Felipe',
      email: 'felipe@test.com',
      cargo: 'admin',
      criadoEm: new Date()
    });

    const resultado = await usuarioService.criarUsuario({
      nome: 'Felipe',
      email: 'felipe@test.com',
      senha: '123456',
      cargo: 'admin'
    });

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'felipe@test.com' }
    });

    expect(prisma.usuario.create).toHaveBeenCalled();
    expect(resultado).toHaveProperty('email', 'felipe@test.com');
    expect(resultado).not.toHaveProperty('senha');
  });

  it('deve lançar erro se o e-mail já estiver cadastrado', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

    await expect(
      usuarioService.criarUsuario({
        nome: 'Duplicado',
        email: 'duplicado@test.com',
        senha: '123456',
        cargo: 'admin'
      })
    ).rejects.toThrow('Usuário já existe com esse e-mail');
  });
});

describe('usuarioService.atualizarUsuario', () => {
  it('deve atualizar o usuário com nova senha', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.usuario.update as jest.Mock).mockResolvedValue({
      id: 1,
      nome: 'Atualizado',
      email: 'email@teste.com',
      cargo: 'admin',
      criadoEm: new Date()
    });

    const resultado = await usuarioService.atualizarUsuarios('1', {
      nome: 'Atualizado',
      senha: 'novasenha123'
    });

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ nome: 'Atualizado' })
    });

    expect(resultado).toEqual({ mensagem: 'Usuario atualizado com sucesso' });
  });

  it('deve lançar erro se o usuário não existir', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      usuarioService.atualizarUsuarios('1', {
        nome: 'Inexistente'
      })
    ).rejects.toThrow('Usuário não encontrado');
  });
});


describe('usuarioService.excluirUsuario', () => {
  it('deve excluir o usuário com sucesso', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.usuario.delete as jest.Mock).mockResolvedValue({ id: 1 });

    const resultado = await usuarioService.excluirUsuario('1');

    expect(prisma.usuario.delete).toHaveBeenCalledWith({
      where: { id: 1 }
    });

    expect(resultado).toEqual({ mensagem: 'Usuário excluído com sucesso' });
  });

  it('deve lançar erro se o usuário não existir', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(usuarioService.excluirUsuario('1')).rejects.toThrow(
      'Usuário não encontrado'
    );
  });
});
