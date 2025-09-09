import path from "path";

export const ROOT_DIR = process.cwd();        
export const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
export const PRODUTOS_DIR = path.join(UPLOADS_DIR, "produtos");
