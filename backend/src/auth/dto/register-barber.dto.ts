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
  normalizeRequiredPhone,
} from '../../common/phone';

export const DEFAULT_SHOP_DESCRIPTION = "Premium men's grooming";

export class RegisterBarberDto {
  /** Shop name — also stored as the barber user's name. */
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => normalizeRequiredPhone(value))
  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  @MatchesPhone10Digits()
  phone!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

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

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
