import { PartialType } from '@nestjs/mapped-types';

import { CreateShopServiceDto } from './create-shop-service.dto';

export class UpdateShopServiceDto extends PartialType(CreateShopServiceDto) {}
