import fs from "fs";
import path from "path";
import multer from "multer"; // se não usa esModuleInterop, faça: import * as multer from "multer";
import { PRODUTOS_DIR } from "../config/paths";

fs.mkdirSync(PRODUTOS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRODUTOS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ok = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.mimetype);
  if (!ok) return cb(new Error("Arquivo inválido (somente imagens)"));
  cb(null, true);
}

export const uploadProduto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
