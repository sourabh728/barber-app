import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  MatchesPhone10Digits,
  normalizeOptionalPhone,
} from '../../common/phone';

export class CreateShopDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalPhone(value))
  @MatchesPhone10Digits()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  pincode!: string;

  /** Number of barbers: 1, 2 or 3 (3 means 3+). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  barberCount?: number;

  /** Scanned onboarding QR payload issued by an admin. */
  @IsOptional()
  @IsString()
  qrPayload?: string;
}
