import { IsBoolean } from 'class-validator';

export class RespondSlotSuggestionDto {
  @IsBoolean()
  accept!: boolean;
}
