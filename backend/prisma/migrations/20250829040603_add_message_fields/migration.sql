-- AlterTable
ALTER TABLE "mensagens" ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "has_explanation" BOOLEAN DEFAULT false,
ADD COLUMN     "query_result" JSONB,
ADD COLUMN     "reverse_translation" TEXT,
ADD COLUMN     "sql_query" TEXT;
