import { PartialType } from '@nestjs/mapped-types';

import { CreateShopStaffDto } from './create-shop-staff.dto';

export class UpdateShopStaffDto extends PartialType(CreateShopStaffDto) {}
