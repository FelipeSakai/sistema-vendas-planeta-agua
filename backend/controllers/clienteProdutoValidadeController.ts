import { Request, Response } from "express";
import * as svc from "../services/clienteProdutoValidadeController";
import { respostaSucesso } from "../utils/response";

export const definirValidade = async (req: Request, res: Response) => {
  const { clienteId, produtoId } = req.params;
  const { validade, quantidade, observacao } = req.body;
  const rec = await svc.upsertValidade(clienteId, produtoId, { validade, quantidade, observacao });
  respostaSucesso(res, "Validade registrada com sucesso", rec);
};

export const listarValidadesDoCliente = async (req: Request, res: Response) => {
  const { clienteId } = req.params;
  const list = await svc.listarPorCliente(clienteId);
  respostaSucesso(res, "Validades do cliente", list);
};
