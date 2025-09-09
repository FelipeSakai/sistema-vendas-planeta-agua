import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";


export type ListarProdutosFiltro = {
    geral?: string;  // busca por nome/tipo
    tipo?: string;
    page?: number;
    perPage?: number;
};

type CriarProdutoDTO = {
    nome: string;
    tipo?: string | null;
    validade?: string | Date | null; // ISO ou Date
    preco: number | Prisma.Decimal | string;
    estoqueAtual?: number;
};

type AtualizarProdutoDTO = Partial<CriarProdutoDTO>;

// helpers
const emptyToNull = <T extends Record<string, any>>(obj: T): T => {
    const out: any = { ...obj };
    for (const k of Object.keys(out)) {
        if (typeof out[k] === "string" && out[k].trim() === "") out[k] = null;
    }
    return out;
};

const normalize = <T extends Record<string, any>>(data: T): T => {
    const out: any = { ...data };

    if (typeof out.nome === "string") out.nome = out.nome.trim();
    if (typeof out.tipo === "string") out.tipo = out.tipo.trim();
    if (typeof out.preco === "string") out.preco = Number(out.preco);
    if (out.validade != null && typeof out.validade === "string") {
        const dt = new Date(out.validade);
        out.validade = isNaN(dt.valueOf()) ? null : dt;
    }
    if (out.estoqueAtual != null) out.estoqueAtual = Number(out.estoqueAtual);

    return emptyToNull(out);
};

// === CRUD ===
export async function criarProduto(data: CriarProdutoDTO) {
    const payload = normalize(data);

    if (!payload.nome) {
        const err = new Error("Nome é obrigatório.");
        (err as any).status = 400;
        throw err;
    }
    if (payload.preco === undefined || payload.preco === null || isNaN(Number(payload.preco))) {
        const err = new Error("Preço é obrigatório.");
        (err as any).status = 400;
        throw err;
    }

    const produto = await prisma.produto.create({
        data: {
            nome: payload.nome,
            tipo: payload.tipo ?? null,
            validade: (payload.validade as Date | null) ?? null,
            preco: new Prisma.Decimal(payload.preco as any),
            estoqueAtual: Number(payload.estoqueAtual ?? 0),
        },
    });

    return produto;
}

export async function listarProdutos(filtro?: ListarProdutosFiltro) {
    const { geral, tipo, page = 1, perPage = 10 } = filtro || {};

    const where: any = {};
    if (tipo && tipo.trim()) where.tipo = { contains: tipo.trim(), mode: "insensitive" };
    if (geral && geral.trim()) {
        const t = geral.trim();
        where.OR = [
            { nome: { contains: t, mode: "insensitive" } },
            { tipo: { contains: t, mode: "insensitive" } },
        ];
    }

    const take = Math.max(1, perPage);
    const skip = (Math.max(1, page) - 1) * take;

    const [total, data] = await Promise.all([
        prisma.produto.count({ where }),
        prisma.produto.findMany({
            where,
            orderBy: { criadoEm: "desc" },
            skip,
            take,
            select: {
                id: true,
                nome: true,
                tipo: true,
                validade: true,
                preco: true,
                estoqueAtual: true,
                criadoEm: true,
                atualizadoEm: true,
            },
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / take));
    return { page, perPage: take, total, totalPages, data };
}

export async function buscarProdutoPorId(id: string) {
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
        const err = new Error("ID inválido.");
        (err as any).status = 400;
        throw err;
    }

    const produto = await prisma.produto.findUnique({
        where: { id: idNum },
    });

    if (!produto) {
        const err = new Error("Produto não encontrado.");
        (err as any).status = 404;
        throw err;
    }

    return produto;
}

export async function atualizarProduto(id: string, data: AtualizarProdutoDTO) {
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
        const err = new Error("ID inválido.");
        (err as any).status = 400;
        throw err;
    }

    const existe = await prisma.produto.findUnique({
        where: { id: idNum },
        select: { id: true },
    });
    if (!existe) {
        const err = new Error("Produto não encontrado.");
        (err as any).status = 404;
        throw err;
    }

    const payload = normalize(data);
    if (payload.preco !== undefined && payload.preco !== null && isNaN(Number(payload.preco))) {
        const err = new Error("Preço inválido.");
        (err as any).status = 400;
        throw err;
    }

    await prisma.produto.update({
        where: { id: idNum },
        data: {
            nome: payload.nome ?? undefined,
            tipo: payload.tipo ?? undefined,
            validade: (payload.validade as Date | null) ?? undefined,
            preco: payload.preco !== undefined ? new Prisma.Decimal(payload.preco as any) : undefined,
            estoqueAtual: payload.estoqueAtual !== undefined ? Number(payload.estoqueAtual) : undefined,
        },
    });

    return { mensagem: "Produto atualizado com sucesso" };
}

export async function excluirProduto(id: string) {
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
        const err = new Error("ID inválido.");
        (err as any).status = 400;
        throw err;
    }

    // hard delete (sem status)
    await prisma.produto.delete({ where: { id: idNum } });
    return { mensagem: "Produto excluído com sucesso" };
}

// === Ajuste de estoque ===
// delta > 0 entrada; delta < 0 saída
export async function ajustarEstoque(id: string, delta: number) {
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
        const err = new Error("ID inválido.");
        (err as any).status = 400;
        throw err;
    }
    if (!Number.isFinite(delta) || delta === 0) {
        const err = new Error("Informe um delta numérico diferente de zero.");
        (err as any).status = 400;
        throw err;
    }

    return await prisma.$transaction(async (trx) => {
        const atual = await trx.produto.findUnique({
            where: { id: idNum },
            select: { estoqueAtual: true },
        });
        if (!atual) {
            const err = new Error("Produto não encontrado.");
            (err as any).status = 404;
            throw err;
        }

        const novo = atual.estoqueAtual + delta;
        if (novo < 0) {
            const err = new Error("Saída maior que o estoque disponível.");
            (err as any).status = 400;
            throw err;
        }

        const updated = await trx.produto.update({
            where: { id: idNum },
            data: { estoqueAtual: novo },
            select: { id: true, nome: true, estoqueAtual: true, atualizadoEm: true },
        });

        return { mensagem: "Estoque atualizado com sucesso", produto: updated };
    });
}
