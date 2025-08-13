import { Request, Response } from 'express';
import * as loginService from '../services/loginService';
import { respostaSucesso } from '../utils/response';

export const login = async (req: Request, res: Response) => {
  const { email, senha } = req.body;
  const resultado = await loginService.autenticar(email, senha);
  respostaSucesso(res, 'Login realizado com sucesso', resultado, 200);
};
