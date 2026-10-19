import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaymentMode } from '../../../generated/prisma/enums';

export class UpdateAdminSettingsDto {
  @IsOptional()
  @IsBoolean()
  maintenanceEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  maintenanceMessage?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  maintenanceUntil?: string | null;

  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  bookingFeeInr?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  payoutAccountName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  payoutUpiId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  payoutBankName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  payoutAccountNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  payoutIfsc?: string | null;
}
