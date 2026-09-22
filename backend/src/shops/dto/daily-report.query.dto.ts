import { IsDateString, IsOptional } from 'class-validator';

export class DailyReportQueryDto {
  /** ISO date string (YYYY-MM-DD). Defaults to today (UTC) if omitted. */
  @IsOptional()
  @IsDateString({ strict: true })
  date?: string;
}
