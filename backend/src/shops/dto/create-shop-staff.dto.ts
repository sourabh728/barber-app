import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export const STAFF_STATUSES = ['ACTIVE', 'ON_LEAVE'] as const;
export type StaffStatusValue = (typeof STAFF_STATUSES)[number];

export class CreateShopStaffDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsIn(STAFF_STATUSES)
  status!: StaffStatusValue;

  /** ISO date string (YYYY-MM-DD). Required when status is ON_LEAVE. */
  @IsOptional()
  @IsDateString({ strict: true })
  leaveReturnDate?: string;
}
