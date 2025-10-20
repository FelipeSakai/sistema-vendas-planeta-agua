import { Request, Response } from "express";
import * as service from "../services/relatorioService";

export async function vendasDiario(req: Request, res: Response) {
    const { data, vendedorId } = req.query as { data?: string; vendedorId?: string };
    const out = await service.vendasDiario({ data, vendedorId: vendedorId ? Number(vendedorId) : undefined });
    res.json({ dados: out });
}

export async function vendasMensal(req: Request, res: Response) {
    const { ano, mes } = req.query as { ano?: string; mes?: string };
    const out = await service.vendasMensal({ ano: Number(ano), mes: Number(mes) });
    res.json({ dados: out });
}

export async function vendasAnual(req: Request, res: Response) {
    const { ano } = req.query as { ano?: string };
    const out = await service.vendasAnual({ ano: Number(ano) });
    res.json({ dados: out });
}

export async function vendasPersonalizado(req: Request, res: Response) {
    const { inicio, fim } = req.query as { inicio?: string; fim?: string };
    const out = await service.vendasPersonalizado({ inicio, fim });
    res.json({ dados: out });
}

export async function estoqueAtual(req: Request, res: Response) {
    const { categoria, status } = req.query as { categoria?: string; status?: string };
    const out = await service.estoqueAtual({ categoria, status: (status as any) || "todos" });
    res.json({ dados: out });
}

export async function estoqueMovimentacao(req: Request, res: Response) {
    const { inicio, fim } = req.query as { inicio?: string; fim?: string };
    const out = await service.estoqueMovimentacao({ inicio, fim });
    res.json({ dados: out });
}

export async function estoqueValidade(req: Request, res: Response) {
    const { dias } = req.query as { dias?: string };
    const out = await service.estoqueValidade({ dias: dias || "30" });
    res.json({ dados: out });
}
