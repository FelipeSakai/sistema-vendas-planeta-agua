import { Request, Response } from "express";
import * as produtoService from "../services/produtoService";
import { respostaSucesso } from "../utils/response";

function publicImageUrl(req: Request, filename?: string | null) {
  if (!filename) return undefined;
  // arquivo já está salvo em /uploads/produtos/<arquivo>
  // e app expõe /uploads como estático
  return `/uploads/produtos/${filename}`;
}

export const criarProduto = async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  const imageUrl = file ? publicImageUrl(req, file.filename) : undefined;

  const produto = await produtoService.criarProduto({
    ...req.body,
    imageUrl,
  });

  respostaSucesso(res, "Produto criado com sucesso", produto, 201);
};

export const listarProdutos = async (req: Request, res: Response) => {
  const { geral = "", tipo, page = "1", perPage = "12" } = req.query;
  const out = await produtoService.listarProdutos({
    geral: String(geral),
    tipo: (tipo as string) || undefined,
    page: Number(page),
    perPage: Number(perPage),
  });
  respostaSucesso(res, "Lista de produtos carregada com sucesso", out);
};

export const buscarProdutoPorId = async (req: Request, res: Response) => {
  const produto = await produtoService.buscarProdutoPorId(req.params.id);
  respostaSucesso(res, "Produto encontrado com sucesso", produto);
};

export const atualizarProduto = async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  const imageUrl = file ? publicImageUrl(req, file.filename) : undefined;

  const r = await produtoService.atualizarProduto(req.params.id, {
    ...req.body,
    imageUrl,
  });

  respostaSucesso(res, r.mensagem);
};

export const excluirProduto = async (req: Request, res: Response) => {
  const r = await produtoService.excluirProduto(req.params.id);
  respostaSucesso(res, r.mensagem);
};

export const ajustarEstoque = async (req: Request, res: Response) => {
  const { delta, operacao, quantidade } = req.body as any;
  let d = Number(delta);
  if (!Number.isFinite(d)) {
    if (operacao && Number.isFinite(Number(quantidade))) {
      d = (String(operacao).toLowerCase() === "saida" ? -1 : 1) * Number(quantidade);
    }
  }
  const out = await produtoService.ajustarEstoque(req.params.id, d);
  respostaSucesso(res, out.mensagem, out.produto);
};

