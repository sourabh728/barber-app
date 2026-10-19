import { IsDateString } from 'class-validator';

export class BookingsReportQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
