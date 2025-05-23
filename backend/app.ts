import express from 'express';
import usuarioRoutes from "./routes/usuarioRoutes";
import { errorHandler } from './middlewares/errorMiddleware';

const app = express();

app.use(express.json());
app.use('/api', usuarioRoutes);
app.use(errorHandler);

export default app;