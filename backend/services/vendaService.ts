// src/services/vendaService.ts
import { Prisma, StatusVenda, FormaPagamento, StatusEntrega } from "@prisma/client";
import { prisma } from "../database/prisma";

// ---------- Tipos ----------
type ItemInputRaw = {
  idProduto?: number;
  produtoId?: number;
  quantidade: number;
  precoUnitario: number; // BRL (ex.: 10.00)
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
  usuarioId: number; // vendedor (vem do token no controller)
  itens?: ItemInputRaw[];
  formaPagamento?: FormaPagamento | string | null;
  desconto?: number; // BRL
  observacao?: string | null;
  status?: StatusVenda | string; // pode vir "PENDENTE" do front -> mapeamos para ABERTA
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
  // sinônimos
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
  // seu enum não tem PENDENTE — interpretamos "PENDENTE" como ABERTA
  const map: Record<string, StatusVenda> = {
    ABERTA: StatusVenda.ABERTA,
    PAGA: StatusVenda.PAGA,
    CANCELADA: StatusVenda.CANCELADA,
    ENTREGUE: StatusVenda.ENTREGUE,
    LOJA: StatusVenda.LOJA,
    PENDENTE: StatusVenda.ABERTA, // mapeamento
  };
  const st = map[raw];
  if (!st) {
    const e = new Error(`Status de venda inválido: ${v}`);
    (e as any).status = 400;
    throw e;
  }
  return st;
}

// ---------- Totais (agora c/ client injetável: prisma ou tx) ----------
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

  // validações
  const [cliente, vendedor] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }),
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } }),
  ]);
  if (!cliente) { const e = new Error("Cliente não encontrado."); (e as any).status = 400; throw e; }
  if (!vendedor) { const e = new Error("Usuário (vendedor) não encontrado."); (e as any).status = 400; throw e; }

  // normalizações
  const itensNorm = (itens || []).map(normalizeItem);
  const formaPagamentoNorm = normalizeFormaPagamento(formaPagamento);
  const statusNorm = normalizeStatusVenda(status);

  return prisma.$transaction(async (tx) => {
    // 1) cria venda base
    const venda = await tx.venda.create({
      data: {
        clienteId,
        usuarioId,
        formaPagamento: formaPagamentoNorm, // pode ser null
        status: statusNorm,                 // ABERTA por padrão (ou LOJA se vier)
        totalBruto: D(0),
        desconto: D(desconto || 0),
        totalLiquido: D(0),
        observacao,
      },
    });

    // 2) cria itens vinculando venda/produto
    for (const it of itensNorm) {
      const qtd = Number(it.quantidade || 0);
      if (!qtd || qtd <= 0) {
        const e = new Error("Item com quantidade inválida.");
        (e as any).status = 400;
        throw e;
      }
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

    // 3) recalcula totais (usando a MESMA tx)
    await recalcularTotais(venda.id, tx);

    // 4) retorna venda completa
    return tx.venda.findUnique({
      where: { id: venda.id },
      include: { itens: true, cliente: true, vendedor: true, entrega: true },
    });
  });
}

// ---------- Itens ----------
export async function adicionarItem(vendaId: number, itemRaw: ItemInputRaw) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { status: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.status !== StatusVenda.ABERTA) { const e = new Error("Só é possível alterar itens com venda ABERTA."); (e as any).status = 400; throw e; }

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

  const totais = await recalcularTotais(vendaId, prisma);
  return { mensagem: "Item adicionado com sucesso", totais };
}

export async function atualizarItem(vendaId: number, itemId: number, data: AtualizarItemDTO) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { status: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.status !== StatusVenda.ABERTA) { const e = new Error("Só é possível alterar itens com venda ABERTA."); (e as any).status = 400; throw e; }

  const atual = await prisma.vendaItem.findUnique({ where: { id: itemId } });
  if (!atual || atual.vendaId !== vendaId) { const e = new Error("Item não pertence à venda."); (e as any).status = 400; throw e; }

  const quantidade = data.quantidade ?? atual.quantidade;
  const precoUnitario = data.precoUnitario != null ? D(data.precoUnitario) : atual.precoUnitario;
  const subtotal = precoUnitario.mul(quantidade);

  await prisma.vendaItem.update({
    where: { id: itemId },
    data: {
      quantidade,
      precoUnitario,
      subtotal,
      validade:
        data.validade === undefined
          ? atual.validade
          : data.validade
            ? new Date(data.validade as any)
            : null,
      observacao: data.observacao ?? atual.observacao,
    },
  });

  const totais = await recalcularTotais(vendaId, prisma);
  return { mensagem: "Item atualizado com sucesso", totais };
}

export async function removerItem(vendaId: number, itemId: number) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { status: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.status !== StatusVenda.ABERTA) { const e = new Error("Só é possível alterar itens com venda ABERTA."); (e as any).status = 400; throw e; }

  const item = await prisma.vendaItem.findUnique({ where: { id: itemId } });
  if (!item || item.vendaId !== vendaId) { const e = new Error("Item não pertence à venda."); (e as any).status = 400; throw e; }

  await prisma.vendaItem.delete({ where: { id: itemId } });
  const totais = await recalcularTotais(vendaId, prisma);
  return { mensagem: "Item removido com sucesso", totais };
}

// ---------- Pagamento ----------
// services/vendaService.ts
export async function confirmarPagamento(vendaId: number, formaPagamento: FormaPagamento, desconto?: number) {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { itens: true },
  });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }

  // ✅ aceitar LOJA também
  if (venda.status !== StatusVenda.ABERTA && venda.status !== StatusVenda.PAGA && venda.status !== StatusVenda.LOJA) {
    const e = new Error("Pagamento só pode ser confirmado com venda ABERTA, PAGA ou LOJA.");
    (e as any).status = 400; throw e;
  }

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


// ---------- Entrega ----------
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
  if (data.status) payload.status = data.status;
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

// ---------- Confirmar entrega ----------
export async function confirmarEntrega(vendaId: number) {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { itens: true, entrega: true },
  });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.itens.length === 0) { const e = new Error("Venda sem itens."); (e as any).status = 400; throw e; }

  await prisma.$transaction(async (tx) => {
    // valida estoque
    for (const it of venda.itens) {
      const produto = await tx.produto.findUnique({ where: { id: it.produtoId }, select: { id: true, estoqueAtual: true } });
      if (!produto) throw new Error(`Produto ${it.produtoId} não encontrado.`);
      if (produto.estoqueAtual < it.quantidade) {
        const e: any = new Error(`Estoque insuficiente para o produto ${it.produtoId}.`);
        e.status = 409;
        throw e;
      }
    }
    // baixa estoque
    for (const it of venda.itens) {
      await tx.produto.update({ where: { id: it.produtoId }, data: { estoqueAtual: { decrement: it.quantidade } } });
    }

    // grava validade por cliente/produto quando houver
    const cliId = (await tx.venda.findUnique({ where: { id: vendaId }, select: { clienteId: true } }))!.clienteId;
    for (const it of venda.itens) {
      if (!it.validade) continue;
      await tx.clienteProdutoValidade.upsert({
        where: { clienteId_produtoId: { clienteId: cliId, produtoId: it.produtoId } },
        update: { validade: it.validade },
        create: { clienteId: cliId, produtoId: it.produtoId, validade: it.validade },
      });
    }

    // status venda / entrega
    await tx.venda.update({ where: { id: vendaId }, data: { status: StatusVenda.ENTREGUE } });
    const now = new Date();
    const existe = await tx.entrega.findUnique({ where: { vendaId } });
    if (existe) {
      await tx.entrega.update({ where: { vendaId }, data: { status: StatusEntrega.ENTREGUE, dataEntrega: now } });
    } else {
      await tx.entrega.create({ data: { vendaId, status: StatusEntrega.ENTREGUE, dataEntrega: now } });
    }
  });

  const atualizado = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { itens: true, entrega: true, cliente: true, vendedor: true },
  });

  return { mensagem: "Entrega confirmada, estoque baixado", venda: atualizado };
}

// ---------- Cancelar venda ----------
export async function cancelarVenda(vendaId: number) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId }, select: { status: true } });
  if (!venda) { const e = new Error("Venda não encontrada."); (e as any).status = 404; throw e; }
  if (venda.status === StatusVenda.ENTREGUE) { const e = new Error("Não é possível cancelar venda já entregue."); (e as any).status = 400; throw e; }

  await prisma.venda.update({ where: { id: vendaId }, data: { status: StatusVenda.CANCELADA } });
  return { mensagem: "Venda cancelada" };
}

// ---------- Buscar/Listar ----------
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
  if (!venda) {
    const e = new Error("Venda não encontrada.");
    (e as any).status = 404;
    throw e;
  }
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

// ---------- Comprovante ----------
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
