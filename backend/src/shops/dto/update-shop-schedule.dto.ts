import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateShopScheduleDto {
  @IsString()
  @IsNotEmpty()
  @Matches(TIME_24H, {
    message: 'openTime must be HH:mm in 24-hour format',
  })
  openTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_24H, {
    message: 'closeTime must be HH:mm in 24-hour format',
  })
  closeTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_24H, {
    message: 'lunchStart must be HH:mm in 24-hour format',
  })
  lunchStart!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_24H, {
    message: 'lunchEnd must be HH:mm in 24-hour format',
  })
  lunchEnd!: string;

  /** ISO date strings (YYYY-MM-DD). Replaces the full holiday set. */
  @IsArray()
  @ArrayUnique()
  @IsDateString({ strict: true }, { each: true })
  holidays!: string[];
}
