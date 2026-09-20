import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';

import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  createShop(createShopDto: CreateShopDto, ownerId: string) {
    return this.prisma.shop.create({
      data: {
        ...createShopDto,
        ownerId,
      },
    });
  }

  async updateMyShop(ownerId: string, updateShopDto: UpdateShopDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return this.prisma.shop.update({
      where: { id: shop.id },
      data: updateShopDto,
    });
  }

  async updateShop(
    shopId: string,
    updateShopDto: UpdateShopDto,
    userId: string,
    userRole: UserRole,
  ) {
    const shop = await this.prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (userRole === UserRole.BARBER && shop.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own shop');
    }

    return this.prisma.shop.update({
      where: {
        id: shopId,
      },
      data: updateShopDto,
    });
  }
}
