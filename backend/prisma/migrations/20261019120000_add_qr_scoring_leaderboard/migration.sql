-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "qrToken" TEXT;

-- Backfill existing shops
UPDATE "Shop" SET "qrToken" = gen_random_uuid()::text WHERE "qrToken" IS NULL;

ALTER TABLE "Shop" ALTER COLUMN "qrToken" SET NOT NULL;
CREATE UNIQUE INDEX "Shop_qrToken_key" ON "Shop"("qrToken");

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "arrivedAt" TIMESTAMP(3),
ADD COLUMN "actualStartAt" TIMESTAMP(3),
ADD COLUMN "serviceStartQrJti" TEXT,
ADD COLUMN "serviceStartQrExpiresAt" TIMESTAMP(3),
ADD COLUMN "serviceStartQrConsumedAt" TIMESTAMP(3),
ADD COLUMN "basePoints" INTEGER,
ADD COLUMN "punctualityPoints" INTEGER,
ADD COLUMN "bookingScore" INTEGER,
ADD COLUMN "scoredAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Appointment_serviceStartQrJti_key" ON "Appointment"("serviceStartQrJti");
CREATE INDEX "Appointment_staffId_actualStartAt_idx" ON "Appointment"("staffId", "actualStartAt");
CREATE INDEX "Appointment_scoredAt_idx" ON "Appointment"("scoredAt");

-- CreateTable
CREATE TABLE "AppointmentArrival" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentArrival_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentArrival_appointmentId_key" ON "AppointmentArrival"("appointmentId");
CREATE INDEX "AppointmentArrival_shopId_arrivedAt_idx" ON "AppointmentArrival"("shopId", "arrivedAt");
CREATE INDEX "AppointmentArrival_customerId_idx" ON "AppointmentArrival"("customerId");

ALTER TABLE "AppointmentArrival" ADD CONSTRAINT "AppointmentArrival_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "VerificationAuditLog" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "shopId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerificationAuditLog_appointmentId_createdAt_idx" ON "VerificationAuditLog"("appointmentId", "createdAt");
CREATE INDEX "VerificationAuditLog_shopId_createdAt_idx" ON "VerificationAuditLog"("shopId", "createdAt");

ALTER TABLE "VerificationAuditLog" ADD CONSTRAINT "VerificationAuditLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
