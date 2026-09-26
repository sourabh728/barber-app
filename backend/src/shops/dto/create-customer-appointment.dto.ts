import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Customer self-service booking request. Always created as PENDING. */
export class CreateCustomerAppointmentDto {
  @IsString()
  @IsNotEmpty()
  serviceName!: string;

  @IsString()
  @IsNotEmpty()
  staffId!: string;

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
  @IsString()
  notes?: string;
}
