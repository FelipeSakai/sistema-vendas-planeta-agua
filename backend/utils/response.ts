import { Response } from 'express';

export function respostaSucesso(
    res: Response,
    mensagem: string,
    dados?: any,
    statusCode: number = 200
) {
    return res.status(statusCode).json({
        sucesso: true,
        mensagem,
        dados: dados || null
    });
}

export function respostaErro(
    res: Response,
    mensagem: string,
    statusCode: number = 400
) {
    return res.status(statusCode).json({
        sucesso: false,
        mensagem
    });
}
