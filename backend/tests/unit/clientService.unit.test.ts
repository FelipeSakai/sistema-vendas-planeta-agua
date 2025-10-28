import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { Status } from '@prisma/client';

// mock do prisma
jest.mock('../../database/prisma', () => {
  const m = {
    cliente: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };
  return { prisma: m };
});

const { prisma } = require('../../database/prisma');
const service = require('../../services/clienteService');

describe('clienteService (unit)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve criar um cliente normalizando os campos', async () => {
    prisma.cliente.findFirst.mockResolvedValueOnce(null);
    prisma.cliente.findFirst.mockResolvedValueOnce(null);
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
      data: expect.objectContaining({
        nome: 'João',
        cpfCnpj: '12345678909',
        telefone: '67999990000',
        email: 'joao@ex.com',
        status: Status.ATIVO,
      }),
    });
  });

  it('deve lançar erro 404 se cliente não existir', async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);
    await expect(service.buscarClientePorId('999')).rejects.toMatchObject({ status: 404 });
  });
});
