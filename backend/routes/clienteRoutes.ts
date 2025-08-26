import { Router } from "express";
import * as clienteController from '../controllers/clienteController';
import { asyncHandler } from "../utils/asyncHandler";
import { auth } from "../middlewares/authMiddleware";
import { Cargo } from "@prisma/client";

const router = Router();

router.get('/clientes', auth([Cargo.ADMIN]), asyncHandler(clienteController.listarClientes));
router.post('/clientes', auth([Cargo.ADMIN]), asyncHandler(clienteController.criarCliente));
router.get('/clientes/:id', auth([Cargo.ADMIN]), asyncHandler(clienteController.buscarClientePorId));
router.put('/clientes/:id', auth([Cargo.ADMIN]), asyncHandler(clienteController.atualizarCliente));
router.delete('/clientes/:id', auth([Cargo.ADMIN]), asyncHandler(clienteController.excluirCliente));

export default router;
