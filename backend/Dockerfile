# Etapa 1: Build da aplicação
FROM node:18-alpine AS builder

ENV TZ=America/Campo_Grande
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Rodar a aplicação em produção
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma   
COPY --from=builder /app/package*.json ./



RUN npm install --omit=dev

CMD ["node", "dist/server.js"]
