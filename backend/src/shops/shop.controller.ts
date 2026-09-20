import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../../generated/prisma/enums';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
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
