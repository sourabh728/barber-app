import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const GOOGLE_LOGIN_ROLES = ['CUSTOMER', 'BARBER'] as const;
export type GoogleLoginRole = (typeof GOOGLE_LOGIN_ROLES)[number];

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @IsOptional()
  @IsIn(GOOGLE_LOGIN_ROLES)
  role?: GoogleLoginRole;
}
