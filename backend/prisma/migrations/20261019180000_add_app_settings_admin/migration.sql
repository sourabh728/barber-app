-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('PAY_AT_SHOP', 'ONLINE_FEE_REST_AT_SHOP');

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maintenanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT NOT NULL DEFAULT 'Trimshim is under maintenance. We’ll be back shortly.',
    "maintenanceUntil" TIMESTAMP(3),
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'PAY_AT_SHOP',
    "bookingFeeInr" INTEGER NOT NULL DEFAULT 11,
    "payoutAccountName" TEXT,
    "payoutUpiId" TEXT,
    "payoutBankName" TEXT,
    "payoutAccountNumber" TEXT,
    "payoutIfsc" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppSettings" ("id", "updatedAt", "createdAt")
VALUES ('default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
