import { Router } from "express";
import * as loginController from "../controllers/loginController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/login", asyncHandler(loginController.login));

export default router;
