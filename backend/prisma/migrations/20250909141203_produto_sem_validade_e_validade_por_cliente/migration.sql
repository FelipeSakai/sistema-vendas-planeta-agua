/*
  Warnings:

  - You are about to drop the column `validade` on the `Produto` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Produto" DROP COLUMN "validade",
ADD COLUMN     "imagem_url" TEXT;

-- CreateTable
CREATE TABLE "public"."ClienteProdutoValidade" (
    "id" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "validade" TIMESTAMP(3) NOT NULL,
    "quantidade" INTEGER DEFAULT 1,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClienteProdutoValidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_cliente_produto_validade" ON "public"."ClienteProdutoValidade"("id_cliente", "id_produto");

-- AddForeignKey
ALTER TABLE "public"."ClienteProdutoValidade" ADD CONSTRAINT "ClienteProdutoValidade_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "public"."tb_cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClienteProdutoValidade" ADD CONSTRAINT "ClienteProdutoValidade_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "public"."Produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;
