import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

import {
  MatchesPhone10Digits,
  normalizeOptionalPhone,
} from '../../common/phone';

export const APPOINTMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
] as const;

export type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalPhone(value))
  @MatchesPhone10Digits()
  customerPhone?: string;

  @IsString()
  @IsNotEmpty()
  serviceName!: string;

  /** Null / omitted = Any Available */
  @IsOptional()
  @IsString()
  staffId?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceInr!: number;

  /** ISO date string (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  date!: string;

  /** 24h HH:mm */
  @IsString()
  @Matches(TIME_RE, { message: 'startTime must be HH:mm' })
  startTime!: string;

  /** 24h HH:mm */
  @IsString()
  @Matches(TIME_RE, { message: 'endTime must be HH:mm' })
  endTime!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isWalkIn?: boolean;

  /** Defaults: walk-in → CONFIRMED, booked → PENDING */
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatusValue;
}
