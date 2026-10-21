import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[.+\]$/, {
    message: 'token must be a valid Expo push token',
  })
  token!: string;
}
