import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ShopAvailabilityQueryDto {
  /** ISO date string (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  date!: string;

  /**
   * Specific barber id. Omit (or pass "any") for shop-wide capacity
   * when the customer chooses "Any available".
   */
  @IsOptional()
  @IsString()
  staffId?: string;
}
