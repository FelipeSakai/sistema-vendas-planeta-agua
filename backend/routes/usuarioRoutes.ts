import { Router } from "express";
import * as usuarioController from '../controllers/usuarioController';
import { asyncHandler } from "../utils/asyncHandler";
import { auth } from "../middlewares/authMiddleware";
import { Cargo } from "@prisma/client";

const router = Router();

router.get('/usuarios',auth([Cargo.ADMIN]), asyncHandler(usuarioController.listarUsuarios));
router.post('/usuarios', auth([Cargo.ADMIN]), asyncHandler(usuarioController.criarUsuario));
router.get('/usuarios/:id', auth([Cargo.ADMIN]), asyncHandler(usuarioController.buscarUsuarioPorId));
router.put('/usuarios/:id', auth([Cargo.ADMIN]), asyncHandler(usuarioController.atualizarUsuario));
router.delete('/usuarios/:id', auth([Cargo.ADMIN]), asyncHandler(usuarioController.excluirUsuario));

export default router;
