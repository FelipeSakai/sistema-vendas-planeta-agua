import path from "path";
import express from 'express';
import { UPLOADS_DIR } from "./config/paths";
import cors from 'cors';
import { errorHandler } from './middlewares/errorMiddleware';
import usuarioRoutes from "./routes/usuarioRoutes";
import loginRoutes from "./routes/loginRoutes";
import clienteRoutes from "./routes/clienteRoutes";
import produtoRoutes from "./routes/produtoRoutes";
import clienteValidadeRoutes from "./routes/clienteValidadeRoutes";


const app = express();
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // coloque os domínios do seu front
    credentials: true
}));
app.use(express.json());
app.use('/api', usuarioRoutes);
app.use("/auth", loginRoutes);
app.use("/api", clienteRoutes);
app.use("/api", produtoRoutes);
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/api", clienteValidadeRoutes);
console.log("Servindo estáticos em:", UPLOADS_DIR);
app.use(errorHandler);
export default app;