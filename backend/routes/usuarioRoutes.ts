import { Router } from "express";
import * as usuarioController from '../controllers/usuarioController';
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post('/usuarios', asyncHandler(usuarioController.criarUsuario));
router.get('/usuarios', asyncHandler(usuarioController.listarUsuarios));
router.get('/usuarios/:id', asyncHandler(usuarioController.buscarUsuarioPorId));
router.put('/usuarios/:id', asyncHandler(usuarioController.atualizarUsuario));
router.delete('/usuarios/:id', asyncHandler(usuarioController.excluirUsuario));

export default router;
