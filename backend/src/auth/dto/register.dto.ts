import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import {
  MatchesPhone10Digits,
  normalizeOptionalPhone,
} from '../../common/phone';

export const REGISTER_ROLES = ['CUSTOMER', 'BARBER'] as const;
export type RegisterRole = (typeof REGISTER_ROLES)[number];

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalPhone(value))
  @MatchesPhone10Digits()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  /** Only CUSTOMER or BARBER — ADMIN cannot be self-assigned at register. */
  @IsOptional()
  @IsIn(REGISTER_ROLES)
  role?: RegisterRole;
}
