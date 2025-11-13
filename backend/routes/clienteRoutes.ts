import { Router } from "express";
import * as clienteController from '../controllers/clienteController';
import { asyncHandler } from "../utils/asyncHandler";
import { auth } from "../middlewares/authMiddleware";
import { Cargo } from "@prisma/client";

const router = Router();

router.get('/clientes', auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(clienteController.listarClientes));
router.post('/clientes', auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(clienteController.criarCliente));
router.get('/clientes/:id', auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(clienteController.buscarClientePorId));
router.put('/clientes/:id', auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(clienteController.atualizarCliente));
router.delete('/clientes/:id', auth([Cargo.ADMIN, Cargo.FUNCIONARIO]), asyncHandler(clienteController.excluirCliente));

export default router;
