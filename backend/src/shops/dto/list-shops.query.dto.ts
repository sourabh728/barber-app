import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListShopsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  /** Case-insensitive match against name, address, city, state, or pincode. */
  @IsOptional()
  @IsString()
  search?: string;

  /** Exact city filter (case-insensitive). */
  @IsOptional()
  @IsString()
  city?: string;

  /** Exact state filter (case-insensitive). */
  @IsOptional()
  @IsString()
  state?: string;

  /** Only shops the signed-in customer has marked as favourite. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  favoritesOnly?: boolean;
}
