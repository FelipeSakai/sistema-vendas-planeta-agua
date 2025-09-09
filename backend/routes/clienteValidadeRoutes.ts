import { Router } from "express";
import { auth } from "../middlewares/authMiddleware";
import { Cargo } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/clienteProdutoValidadeController";

const router = Router();
router.put("/clientes/:clienteId/produtos/:produtoId/validade", auth([Cargo.ADMIN]), asyncHandler(ctrl.definirValidade));
router.get("/clientes/:clienteId/validade", auth([Cargo.ADMIN]), asyncHandler(ctrl.listarValidadesDoCliente));
export default router;
