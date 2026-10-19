import { IsOptional, IsString, Matches } from 'class-validator';

export class LeaderboardQueryDto {
  /** Monday date key YYYY-MM-DD for the week; omit for current week. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  week?: string;
}
