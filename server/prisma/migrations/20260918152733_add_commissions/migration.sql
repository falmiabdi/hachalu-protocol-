-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('Pending', 'Paid', 'Void');

-- CreateEnum
CREATE TYPE "CommissionScope" AS ENUM ('Order', 'Product');

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "defaultCommissionRate" DOUBLE PRECISION DEFAULT 0.10;

-- CreateTable
CREATE TABLE "hachalu_commissions" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "orderId" UUID,
    "productId" UUID,
    "scope" "CommissionScope" NOT NULL DEFAULT 'Order',
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'Pending',
    "paidAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hachalu_commissions_sellerId_idx" ON "hachalu_commissions"("sellerId");

-- CreateIndex
CREATE INDEX "hachalu_commissions_orderId_idx" ON "hachalu_commissions"("orderId");

-- CreateIndex
CREATE INDEX "hachalu_commissions_status_idx" ON "hachalu_commissions"("status");

-- CreateIndex
CREATE INDEX "hachalu_commissions_createdAt_idx" ON "hachalu_commissions"("createdAt");

-- AddForeignKey
ALTER TABLE "hachalu_commissions" ADD CONSTRAINT "hachalu_commissions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_commissions" ADD CONSTRAINT "hachalu_commissions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "hachalu_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_commissions" ADD CONSTRAINT "hachalu_commissions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "hachalu_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
