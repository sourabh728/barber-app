import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopService } from './shop.service';

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER, UserRole.ADMIN)
  createShop(@Body() createShopDto: CreateShopDto, @Req() req: any) {
    return this.shopService.createShop(
      createShopDto,
      req.user.userId,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER, UserRole.ADMIN)
  updateShop(
    @Param('id') shopId: string,
    @Body() updateShopDto: UpdateShopDto,
    @Req() req: any,
  ) {
    return this.shopService.updateShop(
      shopId,
      updateShopDto,
      req.user.userId,
      req.user.role,
    );
  }
}
