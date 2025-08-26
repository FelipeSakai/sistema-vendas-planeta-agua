import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { Status } from '@prisma/client';

// Mock do prisma singleton
jest.mock('../../src/database/prisma', () => {
  const m = {
    cliente: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  return { prisma: m };
});

const { prisma } = require('../../src/database/prisma');
const service = require('../../src/services/clienteService');

describe('clienteService (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('criarCliente normaliza campos e respeita unicidade', async () => {
    prisma.cliente.findFirst.mockResolvedValueOnce(null); // cpf ok
    prisma.cliente.findFirst.mockResolvedValueOnce(null); // email ok
    prisma.cliente.create.mockResolvedValue({
      id: 1,
      nome: 'João',
      cpfCnpj: '12345678909',
      telefone: '67999990000',
      email: 'joao@ex.com',
      endereco: 'Rua A',
      status: Status.ATIVO,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });

    const out = await service.criarCliente({
      nome: '  João  ',
      cpfCnpj: '123.456.789-09',
      telefone: '(67) 99999-0000',
      email: 'JOAO@EX.COM',
      endereco: 'Rua A',
    });

    expect(out.id).toBe(1);
    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: {
        nome: 'João',
        cpfCnpj: '12345678909',
        telefone: '67999990000',
        email: 'joao@ex.com',
        endereco: 'Rua A',
        status: Status.ATIVO,
      },
    });
  });

  it('listarClientes aplica filtros e paginação', async () => {
    prisma.cliente.count.mockResolvedValue(1);
    prisma.cliente.findMany.mockResolvedValue([
      {
        id: 2,
        nome: 'Maria',
        cpfCnpj: null,
        telefone: null,
        email: null,
        endereco: null,
        status: Status.ATIVO,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      },
    ]);

    const res = await service.listarClientes({ q: 'ma', page: 2, perPage: 5 });
    expect(res.page).toBe(2);
    expect(res.perPage).toBe(5);
    expect(res.total).toBe(1);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('buscarClientePorId retorna 404 quando não existe', async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);
    await expect(service.buscarClientePorId('999')).rejects.toMatchObject({ status: 404 });
  });

  it('atualizarClientes lança 409 em e-mail duplicado', async () => {
    prisma.cliente.findUnique.mockResolvedValue({ id: 10 });
    prisma.cliente.findFirst.mockResolvedValueOnce(null); // cpf ok
    prisma.cliente.findFirst.mockResolvedValueOnce({ id: 99 }); // email duplicado

    await expect(service.atualizarClientes('10', { email: 'dup@x.com' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('excluirCliente faz soft delete', async () => {
    prisma.cliente.findUnique.mockResolvedValue({ id: 1, status: Status.ATIVO });
    prisma.cliente.update.mockResolvedValue({ id: 1 });

    const out = await service.excluirCliente('1');
    expect(String(out.mensagem)).toMatch(/inativ|excluíd/i);
    expect(prisma.cliente.update).toHaveBeenCalled();
  });
});
