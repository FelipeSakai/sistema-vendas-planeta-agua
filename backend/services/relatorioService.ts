import { PrismaClient, StatusVenda } from "@prisma/client";
const prisma = new PrismaClient();

function dayBounds(iso?: string) {
    let d: Date;

    if (iso) {
        // Faz o parse manual para evitar UTC
        const [ano, mes, dia] = iso.split("-").map(Number);
        d = new Date(ano, mes - 1, dia, 0, 0, 0); // LOCAL (sem UTC)
    } else {
        d = new Date();
    }

    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    return { start, end };
}
function monthBounds(ano: number, mesIndex1: number) {
    const m = mesIndex1 - 1;
    const start = new Date(ano, m, 1, 0, 0, 0);
    const end = new Date(ano, m + 1, 0, 23, 59, 59, 999);
    return { start, end };
}

function toNumber(x: any) { return Number(x || 0); }
function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }

// ==================== VENDAS ====================

export async function vendasDiario({ data, vendedorId }: { data?: string; vendedorId?: number }) {
    const { start, end } = dayBounds(data);

    const whereVenda: any = {
        dataVenda: { gte: start, lte: end },
        status: { in: [StatusVenda.PAGA, StatusVenda.LOJA, StatusVenda.ENTREGUE] }, // exclui CANCELADA
    };
    if (vendedorId) whereVenda.usuarioId = vendedorId;

    const vendas = await prisma.venda.findMany({
        where: whereVenda,
        include: {
            cliente: true,
            vendedor: true,
            itens: { include: { produto: true } },
        },
        orderBy: { dataVenda: "asc" },
    });

    const faturamento = sum(vendas.map(v => toNumber(v.totalLiquido || v.totalBruto)));
    const totalVendas = vendas.length;
    const ticketMedio = totalVendas ? faturamento / totalVendas : 0;
    const clientesAtendidos = new Set(vendas.map(v => v.clienteId)).size;

    // produtos agregados
    const itens = vendas.flatMap(v => v.itens);
    const porProdutoMap = new Map<number, { nome: string; quantidade: number; valor: number }>();
    itens.forEach(i => {
        const k = i.produtoId;
        const prev = porProdutoMap.get(k) || { nome: i.produto?.nome || `Produto ${k}`, quantidade: 0, valor: 0 };
        prev.quantidade += toNumber(i.quantidade);
        prev.valor += toNumber(i.subtotal);
        porProdutoMap.set(k, prev);
    });
    const produtos = Array.from(porProdutoMap.values());

    // tabela detalhada
    const vendasDetalhe = vendas.map(v => {
        const produtosTxt = v.itens.map(i => `${i.produto?.nome || `Produto ${i.produtoId}`} (${i.quantidade}x)`).join(", ");
        const hora = new Date(v.dataVenda).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return {
            hora,
            cliente: v.cliente?.nome || "-",
            produtos: produtosTxt || "-",
            vendedor: v.vendedor?.nome || "-",
            pagamento: v.formaPagamento || "-",
            valor: toNumber(v.totalLiquido || v.totalBruto),
        };
    });

    return {
        data: start.toISOString(),
        faturamento,
        totalVendas,
        ticketMedio,
        clientesAtendidos,
        produtos: produtos.map(p => ({ nome: p.nome, quantidade: p.quantidade, valor: p.valor })),
        vendas: vendasDetalhe,
        totalTabela: faturamento,
        totalDia: faturamento,
    };
}

export async function vendasMensal({ ano, mes }: { ano: number; mes: number }) {
    const { start, end } = monthBounds(ano, mes);

    const vendas = await prisma.venda.findMany({
        where: {
            dataVenda: { gte: start, lte: end },
            status: { in: [StatusVenda.PAGA, StatusVenda.LOJA, StatusVenda.ENTREGUE] },
        },
        include: { itens: { include: { produto: true } } },
        orderBy: { dataVenda: "asc" },
    });

    const faturamento = sum(vendas.map(v => toNumber(v.totalLiquido || v.totalBruto)));
    const totalVendas = vendas.length;
    const ticketMedio = totalVendas ? faturamento / totalVendas : 0;

    // "novos clientes" no mês (primeira compra no período)
    const comprasPorCliente = new Map<number, number>();
    vendas.forEach(v => comprasPorCliente.set(v.clienteId, (comprasPorCliente.get(v.clienteId) || 0) + 1));
    const novosClientes = Array.from(comprasPorCliente.values()).filter(q => q > 0).length;

    // gráfico dia a dia
    const byDay = new Map<string, number>();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const label = d.toLocaleDateString("pt-BR");
        byDay.set(label, 0);
    }
    vendas.forEach(v => {
        const label = new Date(v.dataVenda).toLocaleDateString("pt-BR");
        byDay.set(label, (byDay.get(label) || 0) + toNumber(v.totalLiquido || v.totalBruto));
    });

    // produtos agregados no mês
    const itens = vendas.flatMap(v => v.itens);
    const porProdutoMap = new Map<number, { nome: string; quantidade: number; valor: number }>();
    itens.forEach(i => {
        const k = i.produtoId;
        const prev = porProdutoMap.get(k) || { nome: i.produto?.nome || `Produto ${k}`, quantidade: 0, valor: 0 };
        prev.quantidade += toNumber(i.quantidade);
        prev.valor += toNumber(i.subtotal);
        porProdutoMap.set(k, prev);
    });

    return {
        mes, ano,
        faturamento,
        totalVendas,
        ticketMedio,
        novosClientes,
        grafico: {
            labels: Array.from(byDay.keys()),
            valores: Array.from(byDay.values()),
        },
        produtos: Array.from(porProdutoMap.values()),
    };
}

export async function vendasAnual({ ano }: { ano: number }) {
    const labels: string[] = [];
    const valores: number[] = [];
    for (let m = 1; m <= 12; m++) {
        const { start, end } = monthBounds(ano, m);
        const vendas = await prisma.venda.findMany({
            where: {
                dataVenda: { gte: start, lte: end },
                status: { in: [StatusVenda.PAGA, StatusVenda.LOJA, StatusVenda.ENTREGUE] },
            },
        });
        const fat = sum(vendas.map(v => toNumber(v.totalLiquido || v.totalBruto)));
        labels.push(`${String(m).padStart(2, "0")}/${ano}`);
        valores.push(fat);
    }

    // totais do ano
    const anoIni = new Date(ano, 0, 1, 0, 0, 0);
    const anoFim = new Date(ano, 11, 31, 23, 59, 59, 999);
    const all = await prisma.venda.findMany({
        where: {
            dataVenda: { gte: anoIni, lte: anoFim },
            status: { in: [StatusVenda.PAGA, StatusVenda.LOJA, StatusVenda.ENTREGUE] },
        },
    });
    const faturamento = sum(all.map(v => toNumber(v.totalLiquido || v.totalBruto)));
    const totalVendas = all.length;
    const ticketMedio = totalVendas ? faturamento / totalVendas : 0;
    const clientesUnicos = new Set(all.map(v => v.clienteId)).size;

    return {
        faturamento, totalVendas, ticketMedio, clientesUnicos,
        grafico: { labels, valores },
    };
}

export async function vendasPersonalizado({ inicio, fim }: { inicio?: string; fim?: string }) {
    if (!inicio || !fim) throw new Error("Datas 'inicio' e 'fim' são obrigatórias.");
    const start = new Date(inicio);
    const end = new Date(new Date(fim).setHours(23, 59, 59, 999));

    const vendas = await prisma.venda.findMany({
        where: {
            dataVenda: { gte: start, lte: end },
            status: { in: [StatusVenda.PAGA, StatusVenda.LOJA, StatusVenda.ENTREGUE] },
        },
        include: { cliente: true, vendedor: true },
        orderBy: { dataVenda: "asc" },
    });

    const faturamento = sum(vendas.map(v => toNumber(v.totalLiquido || v.totalBruto)));

    return {
        faturamento,
        totalVendas: vendas.length,
        ticketMedio: vendas.length ? faturamento / vendas.length : 0,
        clientes: new Set(vendas.map(v => v.clienteId)).size,
        vendas: vendas.map(v => ({
            data: v.dataVenda,
            cliente: v.cliente?.nome || "-",
            vendedor: v.vendedor?.nome || "-",
            pagamento: v.formaPagamento || "-",
            valor: toNumber(v.totalLiquido || v.totalBruto),
        })),
    };
}

// ==================== ESTOQUE ====================

export async function estoqueAtual({ categoria, status }: { categoria?: string; status: "baixo" | "normal" | "alto" | "todos" | string }) {
    const where: any = {};
    if (categoria && categoria !== "todos") where.tipo = categoria;

    const produtos = await prisma.produto.findMany({ where });

    // thresholds simples
    const LIM_BAIXO = 10;
    const LIM_ALTO = 100;

    function statusFrom(qtd: number) {
        if (qtd <= LIM_BAIXO) return "Estoque Baixo";
        if (qtd >= LIM_ALTO) return "Estoque Alto";
        return "Estoque Normal";
    }

    let lista = produtos.map(p => ({
        produto: p.nome,
        tipo: p.tipo || "-",
        quantidade: p.estoqueAtual,
        validade: null as Date | null, // não temos validade no produto
        status: statusFrom(p.estoqueAtual),
        valorTotal: Number(p.preco) * p.estoqueAtual,
    }));

    if (status && status !== "todos") {
        lista = lista.filter(l => {
            const s = l.status.toLowerCase();
            return s.includes(status.toLowerCase());
        });
    }

    const valorEstoque = sum(lista.map(l => l.valorTotal));

    return {
        dataRef: new Date().toISOString(),
        totalProdutos: lista.length,
        estoqueBaixo: lista.filter(l => /baixo/i.test(l.status)).length,
        proximosVencer: 0, // sem base de validade por lote no schema do estoque
        valorEstoque,
        produtos: lista,
    };
}

export async function estoqueMovimentacao({ inicio, fim }: { inicio?: string; fim?: string }) {
    if (!inicio || !fim) throw new Error("Datas 'inicio' e 'fim' são obrigatórias.");
    const start = new Date(inicio);
    const end = new Date(new Date(fim).setHours(23, 59, 59, 999));

    // Sem tabela de movimentação:
    // Consideramos apenas SAÍDAS = itens vendidos no período.
    const vendas = await prisma.venda.findMany({
        where: {
            dataVenda: { gte: start, lte: end },
            status: { in: [StatusVenda.PAGA, StatusVenda.LOJA, StatusVenda.ENTREGUE] },
        },
        include: {
            vendedor: true,
            itens: { include: { produto: true } },
        },
        orderBy: { dataVenda: "asc" },
    });

    const movimentacoes: Array<{
        data: Date;
        produto: string;
        tipo: "saida" | "entrada";
        quantidade: number;
        responsavel: string;
        valor: number;
    }> = [];

    vendas.forEach(v => {
        v.itens.forEach(i => {
            movimentacoes.push({
                data: v.dataVenda,
                produto: i.produto?.nome || `Produto ${i.produtoId}`,
                tipo: "saida",
                quantidade: Number(i.quantidade),
                responsavel: v.vendedor?.nome || "-",
                valor: Number(i.subtotal),
            });
        });
    });

    const totalSaidas = sum(movimentacoes.filter(m => m.tipo === "saida").map(m => m.quantidade));
    const valorMovimentado = sum(movimentacoes.map(m => m.valor));

    return {
        entradas: 0,
        saídas: totalSaidas, // mantemos "saídas" com acento no payload? O front usa totalSaidas
        saidas: totalSaidas, // compatibilidade com o front (sem acento)
        saldo: -totalSaidas,
        valorMovimentado,
        movimentacoes,
    };
}

export async function estoqueValidade({ dias }: { dias: string }) {
    const nDias = dias === "todos" ? null : Number(dias);
    const now = new Date();
    const limite = nDias ? new Date(now.getTime() + nDias * 24 * 60 * 60 * 1000) : null;

    // Vamos usar ClienteProdutoValidade como base de “validades” cadastradas por cliente/produto.
    const where: any = {};
    if (limite) where.validade = { lte: limite };

    const regs = await prisma.clienteProdutoValidade.findMany({
        where,
        include: { produto: true, cliente: true },
        orderBy: { validade: "asc" },
    });

    const produtos = regs.map(r => {
        const diasRestantes = Math.ceil((new Date(r.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
            produto: r.produto?.nome || `Produto ${r.produtoId}`,
            lote: "-", // não há campo de lote no schema atual
            validade: r.validade,
            diasRestantes,
            quantidade: r.quantidade || 1,
            status: diasRestantes <= 30 ? "Próximo a vencer" : "Normal",
        };
    });

    return { periodo: nDias ? `${nDias} dias` : "todos", produtos };
}
