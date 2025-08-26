import { Request, Response } from "express";
import * as clienteService from "../services/clienteService";
import { respostaSucesso } from "../utils/response";

export const criarCliente = async (req: Request, res: Response) => {
    const cliente = await clienteService.criarCliente(req.body);
    respostaSucesso(res, "Cliente criado com sucesso", cliente, 201);
};

export const listarClientes = async (req: Request, res: Response) => {
    const { geral = "", page = "1", perPage = "10", incluirInativos, status } = req.query;
    const out = await clienteService.listarClientes({
        geral: String(geral),
        page: Number(page),
        perPage: Number(perPage),
        incluirInativos: incluirInativos === "true",
        status: (status as any) || undefined, // "ATIVO" | "INATIVO" | "TODOS"
    });
    respostaSucesso(res, "Lista de clientes carregada com sucesso", out, 200);
};

export const buscarClientePorId = async (req: Request, res: Response) => {
    const cliente = await clienteService.buscarClientePorId(req.params.id);
    respostaSucesso(res, "Cliente encontrado com sucesso", cliente);
};

export const atualizarCliente = async (req: Request, res: Response) => {
    const resultado = await clienteService.atualizarCliente(req.params.id, req.body);
    respostaSucesso(res, resultado.mensagem);
};

export const excluirCliente = async (req: Request, res: Response) => {
    const resultado = await clienteService.excluirCliente(req.params.id);
    respostaSucesso(res, resultado.mensagem);
};
