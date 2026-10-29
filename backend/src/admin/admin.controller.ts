import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { BookingsReportQueryDto } from './dto/bookings-report.query.dto';
import { CreateShopQrCodeDto } from './dto/create-shop-qr-code.dto';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.getOverview();
  }

  @Get('bookings-report')
  bookingsReport(@Query() query: BookingsReportQueryDto) {
    return this.adminService.getBookingsReport(query.from, query.to);
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateAdminSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Get('qr-codes')
  listQrCodes() {
    return this.adminService.listShopQrCodes();
  }

  @Post('qr-codes')
  createQrCode(@Body() dto: CreateShopQrCodeDto) {
    return this.adminService.createShopQrCode(dto.name);
  }

  @Delete('qr-codes/:id')
  deleteQrCode(@Param('id') id: string) {
    return this.adminService.deleteShopQrCode(id);
  }
}
