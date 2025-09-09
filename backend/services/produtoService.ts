import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma";

export type ListarProdutosFiltro = {
  geral?: string;
  tipo?: string;
  page?: number;
  perPage?: number;
};

type CriarProdutoDTO = {
  nome: string;
  tipo?: string | null;
  preco: number | Prisma.Decimal | string;
  estoqueAtual?: number;
  imageUrl?: string | null;
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
  if (out.estoqueAtual != null) out.estoqueAtual = Number(out.estoqueAtual);
  return emptyToNull(out);
};

export async function criarProduto(data: CriarProdutoDTO) {
  const payload = normalize(data);
  if (!payload.nome) {
    const err = new Error("Nome é obrigatório."); (err as any).status = 400; throw err;
  }
  if (payload.preco == null || isNaN(Number(payload.preco))) {
    const err = new Error("Preço é obrigatório."); (err as any).status = 400; throw err;
  }

  const produto = await prisma.produto.create({
    data: {
      nome: payload.nome,
      tipo: payload.tipo ?? null,
      preco: new Prisma.Decimal(payload.preco as any),
      estoqueAtual: Number(payload.estoqueAtual ?? 0),
      imageUrl: payload.imageUrl ?? null,
    },
  });

  return produto;
}

export async function listarProdutos(filtro?: ListarProdutosFiltro) {
  const { geral, tipo, page = 1, perPage = 12 } = filtro || {};
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
      where, orderBy: { criadoEm: "desc" }, skip, take,
      select: {
        id: true, nome: true, tipo: true, preco: true,
        estoqueAtual: true, imageUrl: true, criadoEm: true, atualizadoEm: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));
  return { page, perPage: take, total, totalPages, data };
}

export async function buscarProdutoPorId(id: string) {
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) { const e = new Error("ID inválido."); (e as any).status = 400; throw e; }

  const produto = await prisma.produto.findUnique({ where: { id: idNum } });
  if (!produto) { const e = new Error("Produto não encontrado."); (e as any).status = 404; throw e; }
  return produto;
}

export async function atualizarProduto(id: string, data: AtualizarProdutoDTO) {
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) { const e = new Error("ID inválido."); (e as any).status = 400; throw e; }

  const existe = await prisma.produto.findUnique({ where: { id: idNum }, select: { id: true } });
  if (!existe) { const e = new Error("Produto não encontrado."); (e as any).status = 404; throw e; }

  const payload = normalize(data);
  if (payload.preco !== undefined && payload.preco !== null && isNaN(Number(payload.preco))) {
    const e = new Error("Preço inválido."); (e as any).status = 400; throw e;
  }

  await prisma.produto.update({
    where: { id: idNum },
    data: {
      nome: payload.nome ?? undefined,
      tipo: payload.tipo ?? undefined,
      preco: payload.preco != null ? new Prisma.Decimal(payload.preco as any) : undefined,
      estoqueAtual: payload.estoqueAtual != null ? Number(payload.estoqueAtual) : undefined,
      imageUrl: payload.imageUrl !== undefined ? payload.imageUrl : undefined,
    },
  });

  return { mensagem: "Produto atualizado com sucesso" };
}

export async function excluirProduto(id: string) {
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) { const e = new Error("ID inválido."); (e as any).status = 400; throw e; }
  await prisma.produto.delete({ where: { id: idNum } });
  return { mensagem: "Produto excluído com sucesso" };
}

export async function ajustarEstoque(id: string, delta: number) {
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) { const e = new Error("ID inválido."); (e as any).status = 400; throw e; }
  if (!Number.isFinite(delta) || delta === 0) { const e = new Error("Informe um delta numérico diferente de zero."); (e as any).status = 400; throw e; }

  return await prisma.$transaction(async (trx) => {
    const atual = await trx.produto.findUnique({ where: { id: idNum }, select: { estoqueAtual: true } });
    if (!atual) { const e = new Error("Produto não encontrado."); (e as any).status = 404; throw e; }

    const novo = atual.estoqueAtual + delta;
    if (novo < 0) { const e = new Error("Saída maior que o estoque disponível."); (e as any).status = 400; throw e; }

    const updated = await trx.produto.update({
      where: { id: idNum },
      data: { estoqueAtual: novo },
      select: { id: true, nome: true, estoqueAtual: true, atualizadoEm: true },
    });

    return { mensagem: "Estoque atualizado com sucesso", produto: updated };
  });
}
