import { Request, Response, NextFunction } from "express";
import * as usuarioService from '../services/usuarioService';
import { respostaSucesso } from "../utils/response";

export const criarUsuario = async (req: Request, res: Response) => {
    const usuario = await usuarioService.criarUsuario(req.body);
    respostaSucesso(res, 'Usuário criado com sucesso', usuario, 201);
}

export const listarUsuarios = async (req: Request, res: Response) => {
    const usuario = await usuarioService.listarUsuarios();
    respostaSucesso(res, 'Lista de usuários carregada com sucesso', usuario, 200);
}

export const buscarUsuarioPorId = async (req: Request, res: Response) => {
    const usuario = await usuarioService.buscarUsuarioPorId(req.params.id);
    respostaSucesso(res, 'Usuário encontrado com sucesso', usuario);
}

export const atualizarUsuario = async (req: Request, res: Response) => {
    const usuarioAtualizado = await usuarioService.atualizarUsuarios(req.params.id, req.body);
    respostaSucesso(res, usuarioAtualizado.mensagem);
}

export const excluirUsuario = async (req: Request, res: Response) => {
    const resultado = await usuarioService.excluirUsuario(req.params.id);
    respostaSucesso(res, resultado.mensagem);

}
