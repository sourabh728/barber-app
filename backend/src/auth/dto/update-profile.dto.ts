import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import {
  MatchesPhone10Digits,
  normalizeOptionalPhone,
} from '../../common/phone';

/** Authenticated user may update profile fields only — never role. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalPhone(value))
  @MatchesPhone10Digits()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
