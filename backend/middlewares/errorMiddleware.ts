import { Request, Response, NextFunction } from 'express';
import { respostaErro } from '../utils/response';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Erro:', err.message || err);

  const status = err.statusCode || 400;
  const mensagem = err.message || 'Erro interno no servidor';

  respostaErro(res, mensagem, status);
};