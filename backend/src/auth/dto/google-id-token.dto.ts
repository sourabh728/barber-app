import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class GoogleIdTokenDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

export class ResetPasswordWithGoogleDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
