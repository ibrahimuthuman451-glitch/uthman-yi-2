-- CreateEnum
CREATE TYPE "DeliveryFeeStatus" AS ENUM ('PENDING_AGREEMENT', 'AGREED', 'WAIVED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'MANUAL_AIRTEL_MONEY';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryFeeAgreedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryFeeAgreedBy" TEXT,
ADD COLUMN     "deliveryFeeAgreedRwf" INTEGER,
ADD COLUMN     "deliveryFeeStatus" "DeliveryFeeStatus" NOT NULL DEFAULT 'PENDING_AGREEMENT';
