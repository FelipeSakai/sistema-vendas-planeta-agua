import { prisma } from "../database/prisma";

export async function upsertValidade(clienteId: string, produtoId: string, data: { validade: string | Date, quantidade?: number, observacao?: string }) {
  const cid = Number(clienteId), pid = Number(produtoId);
  if (!Number.isFinite(cid) || !Number.isFinite(pid)) {
    const e = new Error("IDs inválidos."); (e as any).status = 400; throw e;
  }
  const dt = new Date(data.validade);
  if (isNaN(dt.valueOf())) { const e = new Error("Data de validade inválida."); (e as any).status = 400; throw e; }

  const rec = await prisma.clienteProdutoValidade.upsert({
    where: { clienteId_produtoId: { clienteId: cid, produtoId: pid } },
    update: { validade: dt, quantidade: data.quantidade ?? undefined, observacao: data.observacao ?? undefined },
    create: { clienteId: cid, produtoId: pid, validade: dt, quantidade: data.quantidade ?? null, observacao: data.observacao ?? null },
  });
  return rec;
}

export async function listarPorCliente(clienteId: string) {
  const cid = Number(clienteId);
  if (!Number.isFinite(cid)) { const e = new Error("ID inválido."); (e as any).status = 400; throw e; }

  return prisma.clienteProdutoValidade.findMany({
    where: { clienteId: cid },
    include: { produto: { select: { id: true, nome: true, tipo: true } } },
    orderBy: { atualizadoEm: "desc" },
  });
}
