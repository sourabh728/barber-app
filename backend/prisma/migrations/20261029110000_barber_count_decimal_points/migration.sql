-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "barberCount" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Appointment"
  ALTER COLUMN "basePoints" TYPE DECIMAL(3,1),
  ALTER COLUMN "punctualityPoints" TYPE DECIMAL(3,1),
  ALTER COLUMN "bookingScore" TYPE DECIMAL(3,1),
  ADD COLUMN "scoredBarberCount" INTEGER;
