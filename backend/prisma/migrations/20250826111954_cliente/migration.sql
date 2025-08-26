-- CreateTable
CREATE TABLE "public"."tb_cliente" (
    "id_cliente" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "cpf_cnpj" VARCHAR(20),
    "telefone" VARCHAR(20),
    "email" VARCHAR(100),
    "endereco" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateIndex
CREATE UNIQUE INDEX "tb_cliente_cpf_cnpj_key" ON "public"."tb_cliente"("cpf_cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "tb_cliente_email_key" ON "public"."tb_cliente"("email");

-- CreateIndex
CREATE INDEX "tb_cliente_cpf_cnpj_idx" ON "public"."tb_cliente"("cpf_cnpj");
