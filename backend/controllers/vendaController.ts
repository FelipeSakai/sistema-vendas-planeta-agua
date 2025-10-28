import { Request, Response } from "express";
import * as vendaService from "../services/vendaService";
import { respostaSucesso } from "../utils/response";
import { FormaPagamento, StatusVenda } from "@prisma/client";


export async function criarVenda(req: Request, res: Response) {
    const rawId = (req.user?.id ?? (req as any).user?.id) as number | string | undefined;
    const usuarioId = Number(rawId);

    if (!Number.isFinite(usuarioId)) {
        return res.status(401).json({ sucesso: false, mensagem: "Usuário não autenticado." });
    }

    const {
        clienteId,
        itens,
        formaPagamento,
        desconto,
        observacao,
        status,
    }: {
        clienteId: number | string;
        itens?: any[];
        formaPagamento?: FormaPagamento | string | null;
        desconto?: number | string;
        observacao?: string | null;
        status?: StatusVenda | string;
    } = req.body || {};

    try {
        const venda = await vendaService.criarVenda({
            clienteId: Number(clienteId),
            usuarioId,
            itens,
            formaPagamento: (formaPagamento ?? null) as any,
            desconto: desconto != null ? Number(desconto) : 0,
            observacao: observacao ?? null,
            status: status as any,
        });

        return respostaSucesso(res, "Venda criada com sucesso", venda, 201);
    } catch (e: any) {
        console.error("❌ Erro ao criar venda:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao criar venda",
        });
    }
}

export async function adicionarItem(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    try {
        const out = await vendaService.adicionarItem(vendaId, req.body);
        return respostaSucesso(res, out.mensagem, out.totais);
    } catch (e: any) {
        console.error("❌ Erro ao adicionar item:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao adicionar item",
        });
    }
}

export async function atualizarItem(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    try {
        const out = await vendaService.atualizarItem(vendaId, itemId, req.body);
        return respostaSucesso(res, out.mensagem, out.totais);
    } catch (e: any) {
        console.error("❌ Erro ao atualizar item:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao atualizar item",
        });
    }
}

export async function removerItem(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    try {
        const out = await vendaService.removerItem(vendaId, itemId);
        return respostaSucesso(res, out.mensagem, out.totais);
    } catch (e: any) {
        console.error("❌ Erro ao remover item:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao remover item",
        });
    }
}

export async function confirmarPagamento(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const {
        formaPagamento,
        desconto,
    }: {
        formaPagamento: FormaPagamento | string;
        desconto?: number;
    } = req.body || {};

    try {
        const out = await vendaService.confirmarPagamento(vendaId, formaPagamento as any, desconto);
        return respostaSucesso(res, out.mensagem, out);
    } catch (e: any) {
        console.error("❌ Erro ao confirmar pagamento:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao confirmar pagamento",
        });
    }
}

export async function upsertEntrega(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    try {
        const out = await vendaService.upsertEntrega(vendaId, req.body);
        return respostaSucesso(res, out.mensagem, out.entrega);
    } catch (e: any) {
        console.error("❌ Erro ao atualizar entrega:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao atualizar entrega",
        });
    }
}

export async function confirmarEntrega(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    try {
        const out = await vendaService.confirmarEntrega(vendaId);
        return respostaSucesso(res, out.mensagem, out.venda);
    } catch (e: any) {
        console.error("❌ Erro ao confirmar entrega:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao confirmar entrega",
        });
    }
}

export async function cancelarVenda(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    try {
        const out = await vendaService.cancelarVenda(vendaId);
        return respostaSucesso(res, out.mensagem);
    } catch (e: any) {
        console.error("❌ Erro ao cancelar venda:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao cancelar venda",
        });
    }
}

export async function buscarVendaPorId(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    try {
        const venda = await vendaService.buscarVendaPorId(vendaId);
        return respostaSucesso(res, "Venda encontrada", venda);
    } catch (e: any) {
        console.error("❌ Erro ao buscar venda:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao buscar venda",
        });
    }
}

export async function listarVendas(req: Request, res: Response) {
    const { clienteId, status, dataInicio, dataFim, page, perPage } = req.query;
    try {
        const out = await vendaService.listarVendas({
            clienteId: clienteId ? Number(clienteId) : undefined,
            status: status as StatusVenda | undefined,
            dataInicio: dataInicio as string | undefined,
            dataFim: dataFim as string | undefined,
            page: page ? Number(page) : undefined,
            perPage: perPage ? Number(perPage) : undefined,
        });

        return respostaSucesso(res, "Lista de vendas", out);
    } catch (e: any) {
        console.error("❌ Erro ao listar vendas:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao listar vendas",
        });
    }
}

export async function comprovante(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    try {
        const comp = await vendaService.gerarComprovante(vendaId);
        return respostaSucesso(res, "Comprovante gerado", comp);
    } catch (e: any) {
        console.error("❌ Erro ao gerar comprovante:", e);
        return res.status(e.status || 500).json({
            sucesso: false,
            mensagem: e.message || "Erro ao gerar comprovante",
        });
    }
}
