/*
  Warnings:

  - The values [CARTAO,BOLETO] on the enum `FormaPagamento` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FormaPagamento_new" AS ENUM ('DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'OUTRO');
ALTER TABLE "vendas" ALTER COLUMN "formaPagamento" TYPE "FormaPagamento_new" USING ("formaPagamento"::text::"FormaPagamento_new");
ALTER TYPE "FormaPagamento" RENAME TO "FormaPagamento_old";
ALTER TYPE "FormaPagamento_new" RENAME TO "FormaPagamento";
DROP TYPE "public"."FormaPagamento_old";
COMMIT;
