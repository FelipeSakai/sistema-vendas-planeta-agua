import { Prisma, StatusVenda, FormaPagamento, StatusEntrega } from "@prisma/client";
import { prisma } from "../database/prisma";

type ItemInput = {
  produtoId: number;
  quantidade: number;
  precoUnitario: number; // BRL
  validade?: string | Date | null; // opcional, YYYY-MM-DD
  observacao?: string | null;
};

type CriarVendaDTO = {
  clienteId: number;
  usuarioId: number; // vendedor
  itens?: ItemInput[];
  formaPagamento?: FormaPagamento | null;
  desconto?: number; // BRL
  observacao?: string | null;
};

type AtualizarItemDTO = Partial<Pick<ItemInput, "quantidade" | "precoUnitario" | "validade" | "observacao">>;

const D = (n: number | string) => new Prisma.Decimal(n);

// --- helpers de totais ---
async function recalcularTotais(vendaId: number) {
  const itens = await prisma.vendaItem.findMany({
    where: { vendaId },
    select: { quantidade: true, precoUnitario: true, subtotal: true },
  });

  const totalBruto = itens.reduce((acc, it) => acc.plus(it.subtotal), D(0));
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { desconto: true } });
  const desconto = venda?.desconto ?? D(0);
  const totalLiquido = totalBruto.minus(desconto);

  await prisma.venda.update({
    where: { id: vendaId },
    data: { totalBruto, totalLiquido },
  });

  return { totalBruto, desconto, totalLiquido };
}

// --- criação ---
export async function criarVenda(input: CriarVendaDTO) {
  const { clienteId, usuarioId, itens = [], formaPagamento = null, desconto = 0, observacao = null } = input;

  // validações básicas
  const [cliente, vendedor] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }),
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } }),
  ]);
  if (!cliente) { const e = new Error("Cliente não encontrado."); (e as any).status = 400; throw e; }
  if (!vendedor) { const e = new Error("Usuário (vendedor) não encontrado."); (e as any).status = 400; throw e; }

  return prisma.$transaction(async (tx) => {
    // cria venda aberta (totais zerados; itens depois)
    const venda = await tx.venda.create({
      data: {
        clienteId,
        usuarioId,
        formaPagamento: formaPagamento ?? null,
        status: StatusVenda.ABERTA,
        totalBruto: D(0),
        desconto: D(desconto || 0),
        totalLiquido: D(0),
        observacao,
      },
    });

    // cria itens (se houver) e calcula subtotais
    for (const it of itens) {
      const qtd = Number(it.quantidade || 0);
      const preco = D(it.precoUnitario || 0);
      const subtotal = preco.mul(qtd);
      await tx.vendaItem.create({
        data: {
          vendaId: venda.id,
          produtoId: it.produtoId,
          quantidade: qtd,
          precoUnitario: preco,
          subtotal,
          validade: it.validade ? new Date(it.validade) : null,
          observacao: it.observacao ?? null,
        },
      });
    }

    // recalcula totais
    await recalcularTotais(venda.id);

    // retorna venda completa
    return tx.venda.findUnique({
      where: { id: venda.id },
      include: { itens: true, cliente: true, vendedor: true, entrega: true },
    });
  });
}

// --- itens ---
export async function adicionarItem(vendaId: number, item: ItemInput) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { status: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.status !== StatusVenda.ABERTA) { const e = new Error("Só é possível alterar itens com venda ABERTA."); (e as any).status = 400; throw e; }

  const qtd = Number(item.quantidade || 0);
  const preco = D(item.precoUnitario || 0);
  const subtotal = preco.mul(qtd);

  await prisma.vendaItem.create({
    data: {
      vendaId,
      produtoId: item.produtoId,
      quantidade: qtd,
      precoUnitario: preco,
      subtotal,
      validade: item.validade ? new Date(item.validade) : null,
      observacao: item.observacao ?? null,
    },
  });

  const totais = await recalcularTotais(vendaId);
  return { mensagem: "Item adicionado com sucesso", totais };
}

export async function atualizarItem(vendaId: number, itemId: number, data: AtualizarItemDTO) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { status: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.status !== StatusVenda.ABERTA) { const e = new Error("Só é possível alterar itens com venda ABERTA."); (e as any).status = 400; throw e; }

  const existente = await prisma.vendaItem.findUnique({ where: { id: itemId, }, select: { vendaId: true } });
  if (!existente || existente.vendaId !== vendaId) { const e = new Error("Item não pertence à venda."); (e as any).status = 400; throw e; }

  // recalcula subtotal se mudar qtd/preço
  const atual = await prisma.vendaItem.findUnique({ where: { id: itemId } });
  if (!atual) { const e = new Error("Item não encontrado."); (e as any).status = 404; throw e; }

  const quantidade = data.quantidade ?? atual.quantidade;
  const precoUnitario = data.precoUnitario != null ? D(data.precoUnitario) : atual.precoUnitario;
  const subtotal = precoUnitario.mul(quantidade);

  await prisma.vendaItem.update({
    where: { id: itemId },
    data: {
      quantidade,
      precoUnitario,
      subtotal,
      validade: data.validade ? new Date(data.validade as any) : data.validade === null ? null : atual.validade,
      observacao: data.observacao ?? atual.observacao,
    },
  });

  const totais = await recalcularTotais(vendaId);
  return { mensagem: "Item atualizado com sucesso", totais };
}

export async function removerItem(vendaId: number, itemId: number) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { status: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.status !== StatusVenda.ABERTA) { const e = new Error("Só é possível alterar itens com venda ABERTA."); (e as any).status = 400; throw e; }

  const item = await prisma.vendaItem.findUnique({ where: { id: itemId } });
  if (!item || item.vendaId !== vendaId) { const e = new Error("Item não pertence à venda."); (e as any).status = 400; throw e; }

  await prisma.vendaItem.delete({ where: { id: itemId } });
  const totais = await recalcularTotais(vendaId);
  return { mensagem: "Item removido com sucesso", totais };
}

// --- pagamento ---
export async function confirmarPagamento(vendaId: number, formaPagamento: FormaPagamento, desconto?: number) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, include: { itens: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.status !== StatusVenda.ABERTA && venda.status !== StatusVenda.PAGA) {
    const e = new Error("Pagamento só pode ser confirmado com venda ABERTA ou PAGA."); (e as any).status = 400; throw e;
  }

  // atualiza desconto se vier 
  if (typeof desconto === "number") {
    await prisma.venda.update({ where: { id: vendaId }, data: { desconto: D(desconto) } });
  }
  const totais = await recalcularTotais(vendaId);

  const atualizado = await prisma.venda.update({
    where: { id: vendaId },
    data: { formaPagamento, status: StatusVenda.PAGA },
    include: { itens: true, cliente: true, vendedor: true, entrega: true },
  });

  return { mensagem: "Pagamento confirmado", venda: atualizado, totais };
}

// --- entrega (definir/atualizar) ---
type AtualizarEntregaDTO = {
  motoristaId?: number | null;
  status?: StatusEntrega;
  dataSaida?: string | Date | null;
  dataPrevista?: string | Date | null;
  dataEntrega?: string | Date | null;
  observacao?: string | null;
};
export async function upsertEntrega(vendaId: number, data: AtualizarEntregaDTO) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { id: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }

  const payload: any = {};
  if ("motoristaId" in data) payload.motoristaId = data.motoristaId ?? null;
  if ("status" in data && data.status) payload.status = data.status;
  if ("dataSaida" in data) payload.dataSaida = data.dataSaida ? new Date(data.dataSaida) : null;
  if ("dataPrevista" in data) payload.dataPrevista = data.dataPrevista ? new Date(data.dataPrevista) : null;
  if ("dataEntrega" in data) payload.dataEntrega = data.dataEntrega ? new Date(data.dataEntrega) : null;
  if ("observacao" in data) payload.observacao = data.observacao ?? null;

  const existe = await prisma.entrega.findUnique({ where: { vendaId } });
  const entrega = existe
    ? await prisma.entrega.update({ where: { vendaId }, data: payload })
    : await prisma.entrega.create({ data: { vendaId, ...payload } });

  return { mensagem: "Entrega atualizada", entrega };
}

// --- confirmar entrega: baixa estoque + grava validade cliente + status ENTREGUE ---
export async function confirmarEntrega(vendaId: number) {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { itens: true, entrega: true },
  });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.itens.length === 0) { const e = new Error("Venda sem itens."); (e as any).status = 400; throw e; }

  // Baixa de estoque + upsert validade atômicos
  await prisma.$transaction(async (tx) => {
    // verifica e baixa estoque
    for (const it of venda.itens) {
      const produto = await tx.produto.findUnique({ where: { id: it.produtoId }, select: { id: true, estoqueAtual: true } });
      if (!produto) { throw new Error(`Produto ${it.produtoId} não encontrado.`); }
      if (produto.estoqueAtual < it.quantidade) { const e: any = new Error(`Estoque insuficiente para o produto ${it.produtoId}.`); e.status = 409; throw e; }
    }
    for (const it of venda.itens) {
      await tx.produto.update({
        where: { id: it.produtoId },
        data: { estoqueAtual: { decrement: it.quantidade } },
      });
    }

    // grava validade por cliente/produto quando houver
    for (const it of venda.itens) {
      if (!it.validade) continue;
      // precisa do clienteId:
      const cliId = (await tx.venda.findUnique({ where: { id: vendaId }, select: { clienteId: true } }))!.clienteId;
      await tx.clienteProdutoValidade.upsert({
        where: { clienteId_produtoId: { clienteId: cliId, produtoId: it.produtoId } },
        update: { validade: it.validade },
        create: { clienteId: cliId, produtoId: it.produtoId, validade: it.validade },
      });
    }

    // atualiza status venda / entrega
    await tx.venda.update({ where: { id: vendaId }, data: { status: StatusVenda.ENTREGUE } });
    const now = new Date();
    const existe = await tx.entrega.findUnique({ where: { vendaId } });
    if (existe) {
      await tx.entrega.update({
        where: { vendaId },
        data: { status: StatusEntrega.ENTREGUE, dataEntrega: now },
      });
    } else {
      await tx.entrega.create({
        data: { vendaId, status: StatusEntrega.ENTREGUE, dataEntrega: now },
      });
    }
  });

  const atualizado = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { itens: true, entrega: true, cliente: true, vendedor: true },
  });

  return { mensagem: "Entrega confirmada, estoque baixado", venda: atualizado };
}

// --- cancelar venda ---
export async function cancelarVenda(vendaId: number) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { status: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.status === StatusVenda.ENTREGUE) { const e = new Error("Não é possível cancelar venda já entregue."); (e as any).status = 400; throw e; }

  await prisma.venda.update({ where: { id: vendaId }, data: { status: StatusVenda.CANCELADA } });
  return { mensagem: "Venda cancelada" };
}

// --- buscar/listar ---
export async function buscarVendaPorId(vendaId: number) {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { itens: true, cliente: true, vendedor: true, entrega: true },
  });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  return venda;
}

type ListarFiltro = {
  clienteId?: number;
  status?: StatusVenda;
  dataInicio?: string | Date;
  dataFim?: string | Date;
  page?: number;
  perPage?: number;
};
export async function listarVendas(f: ListarFiltro = {}) {
  const where: Prisma.VendaWhereInput = {};
  if (f.clienteId) where.clienteId = f.clienteId;
  if (f.status) where.status = f.status;
  if (f.dataInicio || f.dataFim) {
    where.dataVenda = {
      gte: f.dataInicio ? new Date(f.dataInicio) : undefined,
      lte: f.dataFim ? new Date(f.dataFim) : undefined,
    };
  }

  const page = Math.max(1, f.page || 1);
  const take = Math.max(1, f.perPage || 10);
  const skip = (page - 1) * take;

  const [total, data] = await Promise.all([
    prisma.venda.count({ where }),
    prisma.venda.findMany({
      where,
      orderBy: { dataVenda: "desc" },
      skip, take,
      include: { cliente: true, vendedor: true, entrega: true, itens: true },
    }),
  ]);

  return { page, perPage: take, total, totalPages: Math.ceil(total / take), data };
}

// --- comprovante (JSON) ---
export async function gerarComprovante(vendaId: number) {
  const v = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { cliente: true, vendedor: true, itens: { include: { produto: true } } },
  });
  if (!v) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }

  return {
    numero: v.id,
    data: v.dataVenda,
    cliente: { id: v.cliente.id, nome: v.cliente.nome, cpfCnpj: v.cliente.cpfCnpj || null },
    vendedor: { id: v.vendedor.id, nome: v.vendedor.nome },
    itens: v.itens.map(i => ({
      produtoId: i.produtoId,
      produto: i.produto?.nome ?? "",
      qtd: i.quantidade,
      precoUnit: i.precoUnitario,
      subtotal: i.subtotal,
      validade: i.validade ?? null,
    })),
    totalBruto: v.totalBruto,
    desconto: v.desconto,
    totalLiquido: v.totalLiquido,
    formaPagamento: v.formaPagamento,
    status: v.status,
  };
}
