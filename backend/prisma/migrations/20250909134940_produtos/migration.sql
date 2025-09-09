-- CreateTable
CREATE TABLE "public"."Produto" (
    "id_produto" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(100),
    "validade" TIMESTAMP(3),
    "preco" DECIMAL(10,2) NOT NULL,
    "estoque_atual" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id_produto")
);
