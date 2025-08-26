import { Request, Response, NextFunction, RequestHandler } from "express";
import * as jwt from "jsonwebtoken";
import { Cargo } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role?: Cargo;
        nome?: string;
      };
    }
  }
}
type RoleInput = Cargo | keyof typeof Cargo | Array<Cargo | keyof typeof Cargo>;

function parseRoles(roles?: RoleInput): string[] | null {
  if (!roles) return null;
  const arr = Array.isArray(roles) ? roles : [roles];
  return arr.map(r => String(r).toUpperCase());
}


export function auth(roles?: RoleInput): RequestHandler {
  const allowed = parseRoles(roles); // null => qualquer role

  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
      res.status(401).json({ error: "Token ausente" });
      return; // <- garante retorno void
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: "JWT_SECRET não configurado" });
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as any;

      (req as any).user = {
        id: payload.sub,
        role: String(payload.role).toUpperCase(),
        nome: payload.nome,
      };

      if (allowed && !allowed.includes((req as any).user.role)) {
        res.status(403).json({ error: "Sem permissão" });
        return; // <- sem retornar Response
      }

      next(); // sucesso
    } catch {
      res.status(401).json({ error: "Token inválido ou expirado" });
      return;
    }
  };
}
