import { IsDateString, IsIn, IsOptional } from 'class-validator';

export const APPOINTMENT_TABS = ['upcoming', 'past', 'cancelled'] as const;
export type AppointmentTabValue = (typeof APPOINTMENT_TABS)[number];

export class ListAppointmentsQueryDto {
  /** ISO date string (YYYY-MM-DD). Defaults to today (UTC) if omitted. */
  @IsOptional()
  @IsDateString({ strict: true })
  date?: string;

  @IsOptional()
  @IsIn(APPOINTMENT_TABS)
  tab?: AppointmentTabValue;
}
