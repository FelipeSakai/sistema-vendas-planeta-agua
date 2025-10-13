import { Request, Response } from "express";
import * as vendaService from "../services/vendaService";
import { respostaSucesso } from "../utils/response";
import { FormaPagamento, StatusVenda } from "@prisma/client";

export async function criarVenda(req: Request, res: Response) {
    const rawId = (req.user?.id ?? (req as any).user?.id) as number | string | undefined;
    const usuarioId = Number(rawId);
    console.log("UsuarioId extraído do token:", usuarioId);
    if (!Number.isFinite(usuarioId)) {
        const err: any = new Error("Usuário não autenticado.");
        err.status = 401;
        throw err;
    }

    // NÃO aceitamos usuarioId do body
    const { clienteId, itens, formaPagamento, desconto, observacao } = req.body;

    const venda = await vendaService.criarVenda({
        clienteId: Number(clienteId),
        usuarioId, // vem do token
        itens,
        formaPagamento: formaPagamento as FormaPagamento | undefined,
        desconto,
        observacao,
    });

    respostaSucesso(res, "Venda criada com sucesso", venda, 201);
}


export async function adicionarItem(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const out = await vendaService.adicionarItem(vendaId, req.body);
    respostaSucesso(res, out.mensagem, out.totais);
}

export async function atualizarItem(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const out = await vendaService.atualizarItem(vendaId, itemId, req.body);
    respostaSucesso(res, out.mensagem, out.totais);
}

export async function removerItem(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const out = await vendaService.removerItem(vendaId, itemId);
    respostaSucesso(res, out.mensagem, out.totais);
}

export async function confirmarPagamento(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const { formaPagamento, desconto } = req.body as { formaPagamento: FormaPagamento; desconto?: number };
    const out = await vendaService.confirmarPagamento(vendaId, formaPagamento, desconto);
    respostaSucesso(res, out.mensagem, out);
}

export async function upsertEntrega(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const out = await vendaService.upsertEntrega(vendaId, req.body);
    respostaSucesso(res, out.mensagem, out.entrega);
}

export async function confirmarEntrega(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const out = await vendaService.confirmarEntrega(vendaId);
    respostaSucesso(res, out.mensagem, out.venda);
}

export async function cancelarVenda(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const out = await vendaService.cancelarVenda(vendaId);
    respostaSucesso(res, out.mensagem);
}

export async function buscarVendaPorId(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const venda = await vendaService.buscarVendaPorId(vendaId);
    respostaSucesso(res, "Venda encontrada", venda);
}

export async function listarVendas(req: Request, res: Response) {
    const { clienteId, status, dataInicio, dataFim, page, perPage } = req.query;
    const out = await vendaService.listarVendas({
        clienteId: clienteId ? Number(clienteId) : undefined,
        status: status as StatusVenda | undefined,
        dataInicio: dataInicio as string | undefined,
        dataFim: dataFim as string | undefined,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
    });
    respostaSucesso(res, "Lista de vendas", out);
}

export async function comprovante(req: Request, res: Response) {
    const vendaId = Number(req.params.id);
    const comp = await vendaService.gerarComprovante(vendaId);
    respostaSucesso(res, "Comprovante gerado", comp);
}
