import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ListCustomerAppointmentsQueryDto } from './dto/list-customer-appointments.query.dto';
import { CustomerService } from './customer.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

/**
 * Self-service booking history. Scoped to the signed-in user rather than a
 * role, mirroring `GET /auth/me`, so it stays correct for any account that
 * books an appointment.
 */
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('me/appointments')
  @UseGuards(JwtAuthGuard)
  listMyAppointments(
    @Query() query: ListCustomerAppointmentsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.customerService.listMyAppointments(
      req.user.userId,
      query.status,
    );
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  getMyStats(@Req() req: AuthenticatedRequest) {
    return this.customerService.getMyStats(req.user.userId);
  }
}
