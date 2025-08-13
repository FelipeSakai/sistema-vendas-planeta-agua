/*
  Warnings:

  - You are about to drop the column `senha` on the `tb_usuario` table. All the data in the column will be lost.
  - Added the required column `senhaHash` to the `tb_usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tb_usuario" DROP COLUMN "senha",
ADD COLUMN     "senhaHash" TEXT NOT NULL;
