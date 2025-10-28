import * as relatorioService from '../../services/relatorioService';

// === Mock completo do PrismaClient ===
jest.mock('@prisma/client', () => {
    const mockVenda = {
        findMany: jest.fn(),
    };

    return {
        PrismaClient: jest.fn(() => ({
            venda: mockVenda,
        })),
        StatusVenda: {
            PAGA: 'PAGA',
            LOJA: 'LOJA',
            ENTREGUE: 'ENTREGUE',
            CANCELADA: 'CANCELADA',
        },
    };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('relatorioService.vendasDiario', () => {
    beforeEach(() => jest.clearAllMocks());

    it('deve calcular corretamente o faturamento e total de vendas', async () => {
        prisma.venda.findMany.mockResolvedValue([
            {
                id: 1,
                totalBruto: 100,
                totalLiquido: 80,
                dataVenda: new Date(),
                clienteId: 1,
                cliente: { nome: 'Cliente A' },
                vendedor: { nome: 'Vendedor B' },
                formaPagamento: 'PIX',
                itens: [
                    {
                        produtoId: 1,
                        quantidade: 2,
                        subtotal: 80,
                        produto: { nome: 'Galão 20L' },
                    },
                ],
            },
        ]);

        const result = await relatorioService.vendasDiario({});
        expect(result.faturamento).toBe(80);
        expect(result.totalVendas).toBe(1);
        expect(result.produtos[0].nome).toBe('Galão 20L');
    });

    it('deve retornar valores zerados quando não houver vendas', async () => {
        prisma.venda.findMany.mockResolvedValueOnce([]);
        const result = await relatorioService.vendasDiario({});
        expect(result.faturamento).toBe(0);
        expect(result.totalVendas).toBe(0);
    });
});
