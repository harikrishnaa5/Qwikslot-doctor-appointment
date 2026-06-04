-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");
