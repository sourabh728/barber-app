import { IsIn, IsOptional } from 'class-validator';
import { AppointmentStatus } from '../../../generated/prisma/enums';

const APPOINTMENT_STATUSES = Object.values(AppointmentStatus);

export class ListCustomerAppointmentsQueryDto {
  /** Optional single-status filter. Omit to get the full history. */
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatus;
}
