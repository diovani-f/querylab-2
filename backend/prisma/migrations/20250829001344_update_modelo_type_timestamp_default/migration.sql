-- AlterTable
ALTER TABLE "public"."mensagens" ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."sessoes" ALTER COLUMN "modelo" SET DATA TYPE TEXT;
