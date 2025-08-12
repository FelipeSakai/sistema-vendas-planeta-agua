/*
  Warnings:

  - The `cargo` column on the `tb_usuario` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `atualizadoEm` to the `tb_usuario` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('ADMIN', 'FUNCIONARIO', 'MOTORISTA');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ATIVO', 'INATIVO');

-- AlterTable
ALTER TABLE "tb_usuario" ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ATIVO',
ADD COLUMN     "ultimoLogin" TIMESTAMP(3),
DROP COLUMN "cargo",
ADD COLUMN     "cargo" "Cargo" NOT NULL DEFAULT 'FUNCIONARIO';
