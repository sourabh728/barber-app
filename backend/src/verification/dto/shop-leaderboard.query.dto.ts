import { IsIn, IsOptional, IsString } from 'class-validator';

export class ShopLeaderboardQueryDto {
  /** Exact state filter (case-insensitive). */
  @IsOptional()
  @IsString()
  state?: string;

  /** Exact city filter (case-insensitive). */
  @IsOptional()
  @IsString()
  city?: string;

  /** "true" disables the barber's default own-city filter. */
  @IsOptional()
  @IsIn(['true', 'false'])
  all?: string;
}
