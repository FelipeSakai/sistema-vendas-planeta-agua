-- CreateEnum
CREATE TYPE "public"."StatusVenda" AS ENUM ('ABERTA', 'PAGA', 'CANCELADA', 'ENTREGUE', 'LOJA');

-- CreateEnum
CREATE TYPE "public"."FormaPagamento" AS ENUM ('DINHEIRO', 'CARTAO', 'PIX', 'BOLETO', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."StatusEntrega" AS ENUM ('PENDENTE', 'EM_ROTA', 'ENTREGUE', 'FALHA');

-- CreateTable
CREATE TABLE "public"."vendas" (
    "id_venda" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "formaPagamento" "public"."FormaPagamento",
    "status" "public"."StatusVenda" NOT NULL DEFAULT 'ABERTA',
    "totalBruto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalLiquido" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "data_venda" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id_venda")
);

-- CreateTable
CREATE TABLE "public"."venda_itens" (
    "id_venda_item" SERIAL NOT NULL,
    "id_venda" INTEGER NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "validade" TIMESTAMP(3),
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venda_itens_pkey" PRIMARY KEY ("id_venda_item")
);

-- CreateTable
CREATE TABLE "public"."entregas" (
    "id_entrega" SERIAL NOT NULL,
    "id_venda" INTEGER NOT NULL,
    "id_motorista" INTEGER,
    "status" "public"."StatusEntrega" NOT NULL DEFAULT 'PENDENTE',
    "data_saida" TIMESTAMP(3),
    "data_prevista" TIMESTAMP(3),
    "data_entrega" TIMESTAMP(3),
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id_entrega")
);

-- CreateIndex
CREATE INDEX "vendas_id_cliente_idx" ON "public"."vendas"("id_cliente");

-- CreateIndex
CREATE INDEX "vendas_id_usuario_idx" ON "public"."vendas"("id_usuario");

-- CreateIndex
CREATE INDEX "venda_itens_id_venda_idx" ON "public"."venda_itens"("id_venda");

-- CreateIndex
CREATE INDEX "venda_itens_id_produto_idx" ON "public"."venda_itens"("id_produto");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_id_venda_key" ON "public"."entregas"("id_venda");

-- CreateIndex
CREATE INDEX "entregas_id_motorista_idx" ON "public"."entregas"("id_motorista");

-- AddForeignKey
ALTER TABLE "public"."vendas" ADD CONSTRAINT "vendas_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "public"."tb_cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendas" ADD CONSTRAINT "vendas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."tb_usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."venda_itens" ADD CONSTRAINT "venda_itens_id_venda_fkey" FOREIGN KEY ("id_venda") REFERENCES "public"."vendas"("id_venda") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."venda_itens" ADD CONSTRAINT "venda_itens_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "public"."Produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entregas" ADD CONSTRAINT "entregas_id_venda_fkey" FOREIGN KEY ("id_venda") REFERENCES "public"."vendas"("id_venda") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entregas" ADD CONSTRAINT "entregas_id_motorista_fkey" FOREIGN KEY ("id_motorista") REFERENCES "public"."tb_usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
