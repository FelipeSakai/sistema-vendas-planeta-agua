import * as produtoService from '../../services/produtoService';

// === Mock completo do PrismaClient ===
jest.mock('@prisma/client', () => {
  const mockProduto = {
    create: jest.fn(),
    findMany: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => ({
      produto: mockProduto,
    })),
  };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('produtoService (unit)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve criar um produto com sucesso', async () => {
    prisma.produto.create.mockResolvedValue({
      id: 1,
      nome: 'Galão 20L',
      preco: 25.5,
      estoqueAtual: 10,
      tipo: 'água',
      imagemUrl: '/uploads/produtos/galao.png',
    });

    const result = await produtoService.criarProduto({
      nome: 'Galão 20L',
      preco: 25.5,
      estoqueAtual: 10,
      tipo: 'água',
      imagemUrl: '/uploads/produtos/galao.png',
    });

    expect(result.id).toBe(1);
    expect(prisma.produto.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nome: 'Galão 20L',
        preco: 25.5,
      }),
    });
  });

  it('deve listar produtos corretamente', async () => {
    prisma.produto.findMany.mockResolvedValue([
      { id: 1, nome: 'Galão 20L', preco: 25.5, estoqueAtual: 10, tipo: 'água' },
      { id: 2, nome: 'Galão 10L', preco: 15.0, estoqueAtual: 20, tipo: 'água' },
    ]);

    const result = await produtoService.listarProdutos({
      geral: '',
      tipo: 'todos',
      page: 1,
      perPage: 10,
    });

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);
    expect(prisma.produto.findMany).toHaveBeenCalled();
  });
});
