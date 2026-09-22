import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
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
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateShopDto } from './dto/create-shop.dto';
import { CreateShopStaffDto } from './dto/create-shop-staff.dto';
import { DailyReportQueryDto } from './dto/daily-report.query.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments.query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopScheduleDto } from './dto/update-shop-schedule.dto';
import { UpdateShopStaffDto } from './dto/update-shop-staff.dto';
import { ShopService } from './shop.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER, UserRole.ADMIN)
  createShop(
    @Body() createShopDto: CreateShopDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.createShop(createShopDto, req.user.userId);
  }

  /** Owner's shop schedule. Declared before :id so "me" is not treated as an id. */
  @Get('me/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  getMySchedule(@Req() req: AuthenticatedRequest) {
    return this.shopService.getMySchedule(req.user.userId);
  }

  @Put('me/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  updateMySchedule(
    @Body() updateShopScheduleDto: UpdateShopScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.updateMySchedule(
      req.user.userId,
      updateShopScheduleDto,
    );
  }

  /** Owner's shop staff. Declared before :id so "me" is not treated as an id. */
  @Get('me/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  listMyStaff(@Req() req: AuthenticatedRequest) {
    return this.shopService.listMyStaff(req.user.userId);
  }

  @Post('me/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  createMyStaff(
    @Body() createShopStaffDto: CreateShopStaffDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.createMyStaff(req.user.userId, createShopStaffDto);
  }

  @Patch('me/staff/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  updateMyStaff(
    @Param('id') staffId: string,
    @Body() updateShopStaffDto: UpdateShopStaffDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.updateMyStaff(
      req.user.userId,
      staffId,
      updateShopStaffDto,
    );
  }

  @Delete('me/staff/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  deleteMyStaff(
    @Param('id') staffId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.deleteMyStaff(req.user.userId, staffId);
  }

  /** Owner's shop profile stats. Declared before :id so "me" is not treated as an id. */
  @Get('me/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  getMyStats(@Req() req: AuthenticatedRequest) {
    return this.shopService.getMyStats(req.user.userId);
  }

  /** Owner's shop daily report. Declared before :id so "me" is not treated as an id. */
  @Get('me/reports/daily')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  getMyDailyReport(
    @Query() query: DailyReportQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.getMyDailyReport(req.user.userId, query.date);
  }

  /** Owner's shop appointments. Declared before :id so "me" is not treated as an id. */
  @Get('me/appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  listMyAppointments(
    @Query() query: ListAppointmentsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.listMyAppointments(
      req.user.userId,
      query.date,
      query.tab ?? 'upcoming',
    );
  }

  @Post('me/appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  createMyAppointment(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.createMyAppointment(
      req.user.userId,
      createAppointmentDto,
    );
  }

  @Patch('me/appointments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  updateMyAppointment(
    @Param('id') appointmentId: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.updateMyAppointment(
      req.user.userId,
      appointmentId,
      updateAppointmentDto,
    );
  }

  /** Owner's shop (one shop per barber). Declared before :id so "me" is not treated as an id. */
  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  updateMyShop(
    @Body() updateShopDto: UpdateShopDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.updateMyShop(req.user.userId, updateShopDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER, UserRole.ADMIN)
  updateShop(
    @Param('id') shopId: string,
    @Body() updateShopDto: UpdateShopDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.shopService.updateShop(
      shopId,
      updateShopDto,
      req.user.userId,
      req.user.role,
    );
  }
}
