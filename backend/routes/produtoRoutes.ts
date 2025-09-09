import { Router } from "express";
import { auth } from "../middlewares/authMiddleware";
import { Cargo } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import * as produtoController from "../controllers/produtoController";

const router = Router();

router.get("/produtos", auth([Cargo.ADMIN]), asyncHandler(produtoController.listarProdutos));
router.post("/produtos", auth([Cargo.ADMIN]), asyncHandler(produtoController.criarProduto));
router.get("/produtos/:id", auth([Cargo.ADMIN]), asyncHandler(produtoController.buscarProdutoPorId));
router.put("/produtos/:id", auth([Cargo.ADMIN]), asyncHandler(produtoController.atualizarProduto));
router.delete("/produtos/:id", auth([Cargo.ADMIN]), asyncHandler(produtoController.excluirProduto));
router.patch("/produtos/:id/estoque", auth([Cargo.ADMIN]), asyncHandler(produtoController.ajustarEstoque));

export default router;
