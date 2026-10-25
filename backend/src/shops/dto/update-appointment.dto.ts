import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

import {
  APPOINTMENT_STATUSES,
  AppointmentStatusValue,
  CreateAppointmentDto,
} from './create-appointment.dto';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatusValue;

  /** Offer date/startTime/endTime to the customer instead of changing the booking. */
  @IsOptional()
  @IsBoolean()
  proposeSlot?: boolean;
}
