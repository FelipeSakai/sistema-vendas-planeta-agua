// src/services/vendaService.ts
import { Prisma, StatusVenda, FormaPagamento, StatusEntrega } from "@prisma/client";
import { prisma } from "../database/prisma";

// ---------- Tipos ----------
type ItemInputRaw = {
  idProduto?: number;
  produtoId?: number;
  quantidade: number;
  precoUnitario: number;
  validade?: string | Date | null;
  observacao?: string | null;
};
type ItemInput = {
  produtoId: number;
  quantidade: number;
  precoUnitario: number;
  validade?: string | Date | null;
  observacao?: string | null;
};

type CriarVendaDTO = {
  clienteId: number;
  usuarioId: number;
  itens?: ItemInputRaw[];
  formaPagamento?: FormaPagamento | string | null;
  desconto?: number;
  observacao?: string | null;
  status?: StatusVenda | string;
};


type AtualizarItemDTO = Partial<
  Pick<ItemInput, "quantidade" | "precoUnitario" | "validade" | "observacao">
>;

const D = (n: number | string | Prisma.Decimal) => new Prisma.Decimal(n);

// ---------- Normalizadores ----------
function normalizeItem(i: ItemInputRaw): ItemInput {
  const pid = i.produtoId ?? i.idProduto;
  if (!pid) {
    const e = new Error("Item sem produtoId.");
    (e as any).status = 400;
    throw e;
  }
  return {
    produtoId: Number(pid),
    quantidade: Number(i.quantidade),
    precoUnitario: Number(i.precoUnitario),
    validade: i.validade ?? null,
    observacao: i.observacao ?? null,
  };
}

function normalizeFormaPagamento(v: FormaPagamento | string | null | undefined): FormaPagamento | null {
  if (v == null) return null;
  const raw = String(v).trim().toUpperCase().replace(/[\s-]+/g, "_");
  const map: Record<string, FormaPagamento> = {
    DINHEIRO: "DINHEIRO",
    PIX: "PIX",
    OUTRO: "OUTRO",
    CARTAO: "CARTAO_CREDITO",
    CREDITO: "CARTAO_CREDITO",
    CARTAO_CREDITO: "CARTAO_CREDITO",
    CARTAO_DEBITO: "CARTAO_DEBITO",
    DEBITO: "CARTAO_DEBITO",
  } as any;

  const fp = map[raw];
  if (!fp) {
    const e = new Error(`Forma de pagamento inválida: ${v}`);
    (e as any).status = 400;
    throw e;
  }
  return fp;
}

function normalizeStatusVenda(v: StatusVenda | string | null | undefined): StatusVenda {
  if (v == null) return StatusVenda.ABERTA;
  const raw = String(v).trim().toUpperCase();
  const map: Record<string, StatusVenda> = {
    ABERTA: StatusVenda.ABERTA,
    PAGA: StatusVenda.PAGA,
    CANCELADA: StatusVenda.CANCELADA,
    ENTREGUE: StatusVenda.ENTREGUE,
    LOJA: StatusVenda.LOJA,
    PENDENTE: StatusVenda.ABERTA,
  };
  const st = map[raw];
  if (!st) {
    const e = new Error(`Status de venda inválido: ${v}`);
    (e as any).status = 400;
    throw e;
  }
  return st;
}

// ---------- Totais ----------
async function recalcularTotais(
  vendaId: number,
  client: typeof prisma | Prisma.TransactionClient = prisma
) {
  const itens = await client.vendaItem.findMany({
    where: { vendaId },
    select: { subtotal: true },
  });

  const totalBruto = itens.reduce((acc, it) => acc.add(it.subtotal), D(0));
  const venda = await client.venda.findUnique({
    where: { id: vendaId },
    select: { desconto: true },
  });

  const desconto = venda?.desconto ?? D(0);
  const totalLiquido = totalBruto.sub(desconto);
  const totalLiquidoNaoNeg = totalLiquido.lessThan(0) ? D(0) : totalLiquido;

  await client.venda.update({
    where: { id: vendaId },
    data: { totalBruto, totalLiquido: totalLiquidoNaoNeg },
  });

  return { totalBruto, desconto, totalLiquido: totalLiquidoNaoNeg };
}

// ---------- Criação ----------
export async function criarVenda(input: CriarVendaDTO) {
  const {
    clienteId,
    usuarioId,
    itens = [],
    formaPagamento = null,
    desconto = 0,
    observacao = null,
    status = undefined,
  } = input;

  const [cliente, vendedor] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }),
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } }),
  ]);
  if (!cliente) throw new Error("Cliente não encontrado.");
  if (!vendedor) throw new Error("Usuário (vendedor) não encontrado.");

  const itensNorm = (itens || []).map(normalizeItem);
  const formaPagamentoNorm = normalizeFormaPagamento(formaPagamento);
  const statusNorm = normalizeStatusVenda(status);

  return prisma.$transaction(async (tx) => {
    const venda = await tx.venda.create({
      data: {
        clienteId,
        usuarioId,
        formaPagamento: formaPagamentoNorm,
        status: statusNorm,
        totalBruto: D(0),
        desconto: D(desconto || 0),
        totalLiquido: D(0),
        observacao,
      },
    });

    for (const it of itensNorm) {
      const qtd = Number(it.quantidade || 0);
      const preco = D(it.precoUnitario || 0);
      const subtotal = preco.mul(qtd);

      await tx.vendaItem.create({
        data: {
          venda: { connect: { id: venda.id } },
          produto: { connect: { id: it.produtoId } },
          quantidade: qtd,
          precoUnitario: preco,
          subtotal,
          validade: it.validade ? new Date(it.validade) : null,
          observacao: it.observacao ?? null,
        },
      });
    }

    await recalcularTotais(venda.id, tx);
    return tx.venda.findUnique({
      where: { id: venda.id },
      include: { itens: true, cliente: true, vendedor: true, entrega: true },
    });
  });
}

// ---------- Itens ----------
export async function adicionarItem(vendaId: number, itemRaw: ItemInputRaw) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId } });
  if (!venda) throw new Error("Venda não encontrada.");
  if (venda.status !== StatusVenda.ABERTA)
    throw new Error("Só é possível adicionar itens em venda ABERTA.");

  const item = normalizeItem(itemRaw);
  const qtd = Number(item.quantidade || 0);
  const preco = D(item.precoUnitario || 0);
  const subtotal = preco.mul(qtd);

  await prisma.vendaItem.create({
    data: {
      venda: { connect: { id: vendaId } },
      produto: { connect: { id: item.produtoId } },
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
  const venda = await prisma.venda.findUnique({ where: { id: vendaId } });
  if (!venda) throw new Error("Venda não encontrada.");
  if (venda.status !== StatusVenda.ABERTA)
    throw new Error("Só é possível editar itens em venda ABERTA.");

  const atual = await prisma.vendaItem.findUnique({ where: { id: itemId } });
  if (!atual || atual.vendaId !== vendaId) throw new Error("Item não pertence à venda.");

  const quantidade = data.quantidade ?? atual.quantidade;
  const precoUnitario = data.precoUnitario != null ? D(data.precoUnitario) : atual.precoUnitario;
  const subtotal = precoUnitario.mul(quantidade);

  await prisma.vendaItem.update({
    where: { id: itemId },
    data: {
      quantidade,
      precoUnitario,
      subtotal,
      validade: data.validade ? new Date(data.validade) : atual.validade,
      observacao: data.observacao ?? atual.observacao,
    },
  });

  const totais = await recalcularTotais(vendaId);
  return { mensagem: "Item atualizado com sucesso", totais };
}

export async function removerItem(vendaId: number, itemId: number) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId } });
  if (!venda) throw new Error("Venda não encontrada.");
  if (venda.status !== StatusVenda.ABERTA)
    throw new Error("Só é possível remover itens em venda ABERTA.");

  const item = await prisma.vendaItem.findUnique({ where: { id: itemId } });
  if (!item || item.vendaId !== vendaId) throw new Error("Item não pertence à venda.");

  await prisma.vendaItem.delete({ where: { id: itemId } });
  const totais = await recalcularTotais(vendaId);
  return { mensagem: "Item removido com sucesso", totais };
}

// ---------- Pagamento (baixa de estoque aqui) ----------
export async function confirmarPagamento(vendaId: number, formaPagamento: FormaPagamento, desconto?: number) {
  return prisma.$transaction(async (tx) => {
    const venda = await tx.venda.findUnique({
      where: { id: vendaId },
      include: { itens: true },
    });
    if (!venda) throw new Error("Venda não encontrada.");

    if (venda.status !== StatusVenda.ABERTA && venda.status !== StatusVenda.LOJA) {
      throw new Error("Pagamento só pode ser confirmado com venda ABERTA ou LOJA.");
    }

    // ✅ Validação de estoque antes de baixar
    for (const it of venda.itens) {
      const produto = await tx.produto.findUnique({
        where: { id: it.produtoId },
        select: { nome: true, estoqueAtual: true },
      });
      if (!produto) throw new Error(`Produto ${it.produtoId} não encontrado.`);
      if (produto.estoqueAtual < it.quantidade) {
        throw new Error(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoqueAtual}`);
      }
    }

    // ✅ Baixa de estoque
    for (const it of venda.itens) {
      await tx.produto.update({
        where: { id: it.produtoId },
        data: { estoqueAtual: { decrement: it.quantidade } },
      });
    }

    if (typeof desconto === "number") {
      await tx.venda.update({ where: { id: vendaId }, data: { desconto: D(desconto) } });
    }

    const totais = await recalcularTotais(vendaId, tx);

    const atualizado = await tx.venda.update({
      where: { id: vendaId },
      data: { formaPagamento, status: StatusVenda.PAGA },
      include: { itens: true, cliente: true, vendedor: true, entrega: true },
    });

    return { mensagem: "Pagamento confirmado e estoque atualizado", venda: atualizado, totais };
  });
}

// ---------- Entregas ----------
export async function upsertEntrega(vendaId: number, data: any) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId } });
  if (!venda) throw new Error("Venda não encontrada.");

  // normaliza datas
  const fixDate = (d: any) => {
    if (!d) return null;
    if (d instanceof Date) return d;
    const raw = String(d).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(raw + "T00:00:00");
    }

    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const entregaData = data.entrega ? data.entrega : data;

  const payload: any = {};

  if ("motoristaId" in entregaData) {
    payload.motoristaId = entregaData.motoristaId ? Number(entregaData.motoristaId) : null;
  }

  if ("dataPrevista" in entregaData) {
    payload.dataPrevista = entregaData.dataPrevista
      ? fixDate(entregaData.dataPrevista)
      : null;
  }

  if ("dataEntrega" in entregaData) {
    payload.dataEntrega = entregaData.dataEntrega
      ? fixDate(entregaData.dataEntrega)
      : null;
  }

  if ("status" in entregaData) {
    payload.status = entregaData.status;
  }

  const existe = await prisma.entrega.findUnique({ where: { vendaId } });

  const entrega = existe
    ? await prisma.entrega.update({ where: { vendaId }, data: payload })
    : await prisma.entrega.create({ data: { vendaId, ...payload } });

  return { mensagem: "Entrega atualizada", entrega };
}




export async function confirmarEntrega(vendaId: number) {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { entrega: true },
  });
  if (!venda) throw new Error("Venda não encontrada.");

  const now = new Date();
  const entrega = venda.entrega
    ? await prisma.entrega.update({
      where: { vendaId },
      data: { status: StatusEntrega.ENTREGUE, dataEntrega: now },
    })
    : await prisma.entrega.create({
      data: { vendaId, status: StatusEntrega.ENTREGUE, dataEntrega: now },
    });

  const vendaAtualizada = await prisma.venda.update({
    where: { id: vendaId },
    data: { status: StatusVenda.ENTREGUE },
    include: { entrega: true, cliente: true, vendedor: true, itens: true },
  });

  return { mensagem: "Entrega confirmada", entrega, venda: vendaAtualizada };
}

// ---------- Cancelar venda (reverte estoque se já pago) ----------
export async function cancelarVenda(vendaId: number) {
  return prisma.$transaction(async (tx) => {
    const venda = await tx.venda.findUnique({
      where: { id: vendaId },
      include: { itens: true },
    });
    if (!venda) throw new Error("Venda não encontrada.");

    if (venda.status === StatusVenda.ENTREGUE) {
      throw new Error("Não é possível cancelar venda já entregue.");
    }

    // ✅ devolve estoque se já havia sido baixado
    if (venda.status === StatusVenda.PAGA) {
      for (const it of venda.itens) {
        await tx.produto.update({
          where: { id: it.produtoId },
          data: { estoqueAtual: { increment: it.quantidade } },
        });
      }
    }

    await tx.venda.update({
      where: { id: vendaId },
      data: { status: StatusVenda.CANCELADA },
    });

    return { mensagem: "Venda cancelada e estoque revertido (se aplicável)" };
  });
}

// ---------- Buscar / Listar / Comprovante ----------
export async function buscarVendaPorId(vendaId: number) {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: {
      cliente: true,
      vendedor: true,
      entrega: { include: { motorista: true } },
      itens: { include: { produto: true } },
    },
  });
  if (!venda) throw new Error("Venda não encontrada.");
  return venda;
}

type ListarFiltro = {
  clienteId?: number;
  clienteNome?: string;
  motoristaId?: number;
  status?: StatusVenda;
  dataInicio?: string | Date;
  dataFim?: string | Date;
  page?: number;
  perPage?: number;
};

export async function listarVendas(f: ListarFiltro = {}) {
  const where: Prisma.VendaWhereInput = {};

  if (f.clienteId) where.clienteId = f.clienteId;

  if (f.clienteNome) {
    where.cliente = {
      nome: { contains: f.clienteNome, mode: "insensitive" },
    };
  }

  if (f.motoristaId) {
    where.entrega = { motoristaId: f.motoristaId };
  }

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
      skip,
      take,
      include: { cliente: true, vendedor: true, entrega: { include: { motorista: true } }, itens: true },
    }),
  ]);

  return { page, perPage: take, total, totalPages: Math.ceil(total / take), data };
}

export async function atualizarVenda(vendaId: number, data: any) {
  return prisma.$transaction(async (tx) => {
    const venda = await tx.venda.findUnique({ where: { id: vendaId } });
    if (!venda) throw new Error("Venda não encontrada.");

    const novaDataVenda = data.dataVenda ? new Date(data.dataVenda) : venda.dataVenda;

    const atualizado = await tx.venda.update({
      where: { id: vendaId },
      data: {
        formaPagamento: data.formaPagamento ?? venda.formaPagamento,
        desconto: data.desconto != null ? D(data.desconto) : venda.desconto,
        observacao: data.observacao ?? venda.observacao,
        status: data.status ?? venda.status, // se não vier do front, mantém
        dataVenda: novaDataVenda,
      },
      include: { itens: true, cliente: true, vendedor: true, entrega: true },
    });

    await recalcularTotais(vendaId, tx);

    return { venda: atualizado };
  });
}


export async function gerarComprovante(vendaId: number) {
  const v = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { cliente: true, vendedor: true, itens: { include: { produto: true } } },
  });
  if (!v) throw new Error("Venda não encontrada.");

  return {
    numero: v.id,
    data: v.dataVenda,
    cliente: { id: v.cliente.id, nome: v.cliente.nome, cpfCnpj: v.cliente.cpfCnpj || null },
    vendedor: { id: v.vendedor.id, nome: v.vendedor.nome },
    itens: v.itens.map((i) => ({
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
