import { Router } from "express";
import { auth } from "../middlewares/authMiddleware";
import { Cargo } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import * as produtoController from "../controllers/produtoController";
import { uploadProduto } from "../middlewares/upload";

const router = Router();

router.get("/produtos", auth([Cargo.ADMIN]), asyncHandler(produtoController.listarProdutos));
router.get("/produtos/:id", auth([Cargo.ADMIN]), asyncHandler(produtoController.buscarProdutoPorId));

router.post("/produtos",
    auth([Cargo.ADMIN]),
    uploadProduto.single("imagem"),
    asyncHandler(produtoController.criarProduto)
);

router.put("/produtos/:id",
    auth([Cargo.ADMIN]),
    uploadProduto.single("imagem"),
    asyncHandler(produtoController.atualizarProduto)
);

router.delete("/produtos/:id", auth([Cargo.ADMIN]), asyncHandler(produtoController.excluirProduto));
router.patch("/produtos/:id/estoque", auth([Cargo.ADMIN]), asyncHandler(produtoController.ajustarEstoque));

export default router;
