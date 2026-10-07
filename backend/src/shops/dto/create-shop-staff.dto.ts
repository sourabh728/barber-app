import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import {
  MatchesPhone10Digits,
  normalizeRequiredPhone,
} from '../../common/phone';

export const STAFF_STATUSES = ['ACTIVE', 'AWAY', 'ON_LEAVE'] as const;
export type StaffStatusValue = (typeof STAFF_STATUSES)[number];

/** YYYY-MM-DDTHH:mm or full ISO datetime. */
const AWAY_UNTIL_RE =
  /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z)?$/;

export class CreateShopStaffDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @Transform(({ value }) => normalizeRequiredPhone(value))
  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  @MatchesPhone10Digits()
  phone!: string;

  @IsIn(STAFF_STATUSES)
  status!: StaffStatusValue;

  /** ISO date string (YYYY-MM-DD). Required when status is ON_LEAVE. */
  @IsOptional()
  @IsDateString({ strict: true })
  leaveReturnDate?: string;

  /**
   * Return-by datetime when status is AWAY.
   * Accepts `YYYY-MM-DDTHH:mm` (wall clock) or ISO datetime.
   */
  @IsOptional()
  @IsString()
  @Matches(AWAY_UNTIL_RE, {
    message: 'awayUntil must be YYYY-MM-DDTHH:mm (or ISO datetime)',
  })
  awayUntil?: string;
}
