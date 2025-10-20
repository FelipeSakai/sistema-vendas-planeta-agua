import { Router } from "express";
import { auth } from "../middlewares/authMiddleware";
import { Cargo } from "@prisma/client";
import * as relatorioController from "../controllers/relatorioController";

const router = Router();

// VENDAS
router.get("/vendas/diario", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), relatorioController.vendasDiario);
router.get("/vendas/mensal", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), relatorioController.vendasMensal);
router.get("/vendas/anual", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), relatorioController.vendasAnual);
router.get("/vendas/personalizado", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), relatorioController.vendasPersonalizado);

// ESTOQUE
router.get("/estoque/atual", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), relatorioController.estoqueAtual);
router.get("/estoque/movimentacao", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), relatorioController.estoqueMovimentacao);
router.get("/estoque/validade", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), relatorioController.estoqueValidade);

export default router;
