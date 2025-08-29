/*
  Warnings:

  - You are about to drop the column `modelo` on the `sessoes` table. All the data in the column will be lost.
  - Added the required column `modelo_id` to the `sessoes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sessoes" DROP COLUMN "modelo",
ADD COLUMN     "modelo_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "LLMModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL,

    CONSTRAINT "LLMModel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "LLMModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
