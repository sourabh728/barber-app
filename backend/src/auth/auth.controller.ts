import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';

import { createImageUploadOptions } from '../common/upload';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
// import { ForgotPasswordDto } from './dto/forgot-password.dto';
import {
  GoogleIdTokenDto,
  ResetPasswordWithGoogleDto,
} from './dto/google-id-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterBarberDto } from './dto/register-barber.dto';
import { RegisterDto } from './dto/register.dto';
// import { ResendOtpDto } from './dto/resend-otp.dto';
// import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
// import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register-barber')
  registerBarber(@Body() registerBarberDto: RegisterBarberDto) {
    return this.authService.registerBarber(registerBarberDto);
  }

  // OTP email recovery disabled — Google-verified reset is used instead.
  // @Post('verify-email')
  // verifyEmail(@Body() dto: VerifyEmailDto) {
  //   return this.authService.verifyEmail(dto);
  // }
  //
  // @Post('resend-verification')
  // resendVerification(@Body() dto: ResendOtpDto) {
  //   return this.authService.resendEmailVerification(dto);
  // }
  //
  // @Post('forgot-password')
  // forgotPassword(@Body() dto: ForgotPasswordDto) {
  //   return this.authService.forgotPassword(dto);
  // }
  //
  // @Post('reset-password')
  // resetPassword(@Body() dto: ResetPasswordDto) {
  //   return this.authService.resetPassword(dto);
  // }

  @Post('forgot-password/google')
  lookupAccountByGoogle(@Body() dto: GoogleIdTokenDto) {
    return this.authService.lookupAccountByGoogle(dto);
  }

  @Post('reset-password/google')
  resetPasswordWithGoogle(@Body() dto: ResetPasswordWithGoogleDto) {
    return this.authService.resetPasswordWithGoogle(dto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  loginWithGoogle(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(googleLoginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Post('me/photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo', createImageUploadOptions('profiles')))
  uploadMyPhoto(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }
    return this.authService.updateProfilePhoto(req.user.userId, file.filename);
  }
}
