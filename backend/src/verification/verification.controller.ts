import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../../generated/prisma/enums';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { LeaderboardQueryDto } from './dto/leaderboard.query.dto';
import { ScanServiceStartDto } from './dto/scan-service-start.dto';
import { ScanShopQrDto } from './dto/scan-shop-qr.dto';
import { ShopLeaderboardQueryDto } from './dto/shop-leaderboard.query.dto';
import { VerificationService } from './verification.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /** Barber: static shop QR payload for printing / display. */
  @Get('shops/me/qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  getMyShopQr(@Req() req: AuthenticatedRequest) {
    return this.verificationService.getShopQrForOwner(req.user.userId);
  }

  /** Customer: scan shop static QR to check in. */
  @Post('customers/me/arrivals/scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  scanArrival(@Body() dto: ScanShopQrDto, @Req() req: AuthenticatedRequest) {
    return this.verificationService.scanShopArrival(
      req.user.userId,
      dto.qrPayload,
    );
  }

  /** Customer: issue time-limited service-start QR after arrival. */
  @Post('customers/me/appointments/:id/service-start-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  issueServiceStartQr(
    @Param('id') appointmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.verificationService.issueServiceStartQr(
      req.user.userId,
      appointmentId,
    );
  }

  /** Customer: verification + score details for a booking. */
  @Get('customers/me/appointments/:id/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  getVerification(
    @Param('id') appointmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.verificationService.getAppointmentVerification(
      req.user.userId,
      appointmentId,
    );
  }

  /** Barber: scan customer service-start QR. */
  @Post('shops/me/service-start/scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  scanServiceStart(
    @Body() dto: ScanServiceStartDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.verificationService.scanServiceStart(
      req.user.userId,
      dto.qrPayload,
    );
  }

  /** Barber/Admin: shop points leaderboard with state/city filters. */
  @Get('leaderboard/shops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER, UserRole.ADMIN)
  shopLeaderboard(
    @Query() query: ShopLeaderboardQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.verificationService.getShopLeaderboard(
      req.user.userId,
      req.user.role,
      query,
    );
  }

  /** Barber: weekly ShopStaff leaderboard. */
  @Get('shops/me/leaderboard/weekly')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  weeklyLeaderboard(
    @Query() query: LeaderboardQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.verificationService.getWeeklyLeaderboard(
      req.user.userId,
      query.week,
    );
  }
}
