import { prisma } from '../../database/prisma';
import * as vendaService from '../../services/vendaService';
import { StatusVenda, FormaPagamento } from '@prisma/client';

jest.mock('../../database/prisma', () => ({
    prisma: {
        $transaction: jest.fn((fn) =>
            fn({
                venda: {
                    create: jest.fn().mockResolvedValue({ id: 1 }),
                    findUnique: jest.fn().mockResolvedValue({
                        id: 1,
                        clienteId: 1,
                        usuarioId: 5,
                        totalBruto: 50,
                        totalLiquido: 50,
                        desconto: 0,
                        status: 'ABERTA',
                        cliente: { id: 1, nome: 'Cliente Teste' },
                        vendedor: { id: 5, nome: 'Admin' },
                        entrega: null,
                        itens: [],
                    }),
                    update: jest.fn().mockResolvedValue({}),
                },
                vendaItem: {
                    create: jest.fn().mockResolvedValue({}),
                    findMany: jest.fn().mockResolvedValue([{ subtotal: 50 }]),
                },
            })
        ),
        cliente: { findUnique: jest.fn() },
        usuario: { findUnique: jest.fn() },
        vendaItem: {
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
        },
        venda: {
            findUnique: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            findMany: jest.fn(),
        },
        produto: { findUnique: jest.fn(), update: jest.fn() },
    },
}));


describe('vendaService (unit)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('✅ deve criar uma nova venda com itens', async () => {
        (prisma.cliente.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
        (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
        (prisma.vendaItem.create as jest.Mock).mockResolvedValue({});
        (prisma.venda.findUnique as jest.Mock).mockResolvedValue({
            id: 1,
            clienteId: 1,
            usuarioId: 5,
            totalBruto: 50,
            totalLiquido: 50,
            desconto: 0,
            status: StatusVenda.ABERTA,
            cliente: { id: 1, nome: 'Cliente Teste' },
            vendedor: { id: 5, nome: 'Admin' },
            entrega: null,
            itens: [],
        });

        const result = await vendaService.criarVenda({
            clienteId: 1,
            usuarioId: 5,
            itens: [{ produtoId: 10, quantidade: 2, precoUnitario: 25 }],
            formaPagamento: FormaPagamento.DINHEIRO,
        });

        expect(result).toHaveProperty('id', 1);
        expect(result).toHaveProperty('totalBruto', 50);
        expect(result).toHaveProperty('status', StatusVenda.ABERTA);
    });

    it('🚫 deve lançar erro se cliente não existir', async () => {
        (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({ id: 5 });

        await expect(
            vendaService.criarVenda({
                clienteId: 999,
                usuarioId: 5,
                itens: [{ produtoId: 10, quantidade: 1, precoUnitario: 20 }],
                formaPagamento: FormaPagamento.PIX,
            })
        ).rejects.toThrow('Cliente não encontrado.');
    });

    it('🚫 deve lançar erro se usuário (vendedor) não existir', async () => {
        (prisma.cliente.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
        (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
            vendaService.criarVenda({
                clienteId: 1,
                usuarioId: 999,
                itens: [{ produtoId: 10, quantidade: 1, precoUnitario: 20 }],
                formaPagamento: FormaPagamento.PIX,
            })
        ).rejects.toThrow('Usuário (vendedor) não encontrado.');
    });

    it('🚫 deve lançar erro se item não tiver produtoId', async () => {
        (prisma.cliente.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
        (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({ id: 5 });

        await expect(
            vendaService.criarVenda({
                clienteId: 1,
                usuarioId: 5,
                itens: [{ quantidade: 1, precoUnitario: 10 } as any],
                formaPagamento: FormaPagamento.DINHEIRO,
            })
        ).rejects.toThrow('Item sem produtoId.');
    });

    it('📋 deve listar vendas com paginação', async () => {
        (prisma.venda.count as jest.Mock).mockResolvedValue(1);
        (prisma.venda.findMany as jest.Mock).mockResolvedValue([
            { id: 1, totalLiquido: 100, status: StatusVenda.PAGA },
        ]);

        const res = await vendaService.listarVendas({ page: 1, perPage: 5 });
        expect(res).toHaveProperty('data');
        expect(res.data[0]).toHaveProperty('id', 1);
    });

    it('🔍 deve buscar venda por ID', async () => {
        (prisma.venda.findUnique as jest.Mock).mockResolvedValue({
            id: 5,
            cliente: { id: 1, nome: 'Cliente A' },
            vendedor: { id: 2, nome: 'Vendedor B' },
            itens: [],
            status: StatusVenda.PAGA,
        });

        const res = await vendaService.buscarVendaPorId(5);
        expect(res).toHaveProperty('id', 5);
        expect(res.status).toBe(StatusVenda.PAGA);
    });

    it('🚫 deve lançar erro ao buscar venda inexistente', async () => {
        (prisma.venda.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(vendaService.buscarVendaPorId(999)).rejects.toThrow('Venda não encontrada.');
    });
});
