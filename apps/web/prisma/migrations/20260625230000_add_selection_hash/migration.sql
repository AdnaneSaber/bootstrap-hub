-- AlterTable
ALTER TABLE "Bundle" ADD COLUMN "selectionHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_selectionHash_key" ON "Bundle"("selectionHash");
