import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { auth } from "../middlewares/authMiddleware";
import { Cargo } from "@prisma/client";
import * as vendaController from "../controllers/vendaController";

const router = Router();

// CRUD/lista
router.post("/vendas", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(vendaController.criarVenda));
router.get("/vendas", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(vendaController.listarVendas));
router.get("/vendas/:id", auth([Cargo.ADMIN, Cargo.FUNCIONARIO, Cargo.MOTORISTA]), asyncHandler(vendaController.buscarVendaPorId));
router.patch("/vendas/:id/cancelar", auth([Cargo.ADMIN]), asyncHandler(vendaController.cancelarVenda));

// Itens
router.post("/vendas/:id/itens", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(vendaController.adicionarItem));
router.put("/vendas/:id/itens/:itemId", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(vendaController.atualizarItem));
router.delete("/vendas/:id/itens/:itemId", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(vendaController.removerItem));

// Pagamento
router.patch("/vendas/:id/pagamento", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(vendaController.confirmarPagamento));

// Entrega
router.put("/vendas/:id/entrega", auth([Cargo.ADMIN, Cargo.MOTORISTA]), asyncHandler(vendaController.upsertEntrega));
router.patch("/vendas/:id/entrega/confirmar", auth([Cargo.ADMIN, Cargo.MOTORISTA]), asyncHandler(vendaController.confirmarEntrega));

// Comprovante
router.get("/vendas/:id/comprovante", auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(vendaController.comprovante));

export default router;

