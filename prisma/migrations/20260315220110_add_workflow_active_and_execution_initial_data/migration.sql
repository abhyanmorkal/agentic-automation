-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "initialData" JSONB;

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
