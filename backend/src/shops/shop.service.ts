import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';

import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopScheduleDto } from './dto/update-shop-schedule.dto';

function toDateOnlyUtc(isoDate: string): Date {
  // Parse YYYY-MM-DD as UTC midnight so @db.Date stays stable across TZ.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new BadRequestException(`Invalid holiday date: ${isoDate}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function assertScheduleOrder(dto: UpdateShopScheduleDto) {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const open = toMinutes(dto.openTime);
  const close = toMinutes(dto.closeTime);
  const lunchStart = toMinutes(dto.lunchStart);
  const lunchEnd = toMinutes(dto.lunchEnd);

  if (open >= close) {
    throw new BadRequestException('Opening time must be before closing time');
  }

  if (lunchStart >= lunchEnd) {
    throw new BadRequestException('Lunch start must be before lunch end');
  }

  if (lunchStart < open || lunchEnd > close) {
    throw new BadRequestException(
      'Lunch break must fall within opening and closing times',
    );
  }
}

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

  private async findOwnerShop(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  async getMySchedule(ownerId: string) {
    const shop = await this.findOwnerShop(ownerId);
    const holidays = await this.prisma.shopHoliday.findMany({
      where: { shopId: shop.id },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    return {
      shopId: shop.id,
      openTime: shop.openTime,
      closeTime: shop.closeTime,
      lunchStart: shop.lunchStart,
      lunchEnd: shop.lunchEnd,
      holidays: holidays.map((h) => formatDateOnly(h.date)),
    };
  }

  async updateMySchedule(ownerId: string, dto: UpdateShopScheduleDto) {
    assertScheduleOrder(dto);

    const shop = await this.findOwnerShop(ownerId);
    const holidayDates = dto.holidays.map(toDateOnlyUtc);

    await this.prisma.$transaction(async (tx) => {
      await tx.shop.update({
        where: { id: shop.id },
        data: {
          openTime: dto.openTime,
          closeTime: dto.closeTime,
          lunchStart: dto.lunchStart,
          lunchEnd: dto.lunchEnd,
        },
      });

      await tx.shopHoliday.deleteMany({
        where: { shopId: shop.id },
      });

      if (holidayDates.length > 0) {
        await tx.shopHoliday.createMany({
          data: holidayDates.map((date) => ({
            shopId: shop.id,
            date,
          })),
        });
      }
    });

    return this.getMySchedule(ownerId);
  }

  async updateMyShop(ownerId: string, updateShopDto: UpdateShopDto) {
    const shop = await this.findOwnerShop(ownerId);

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
