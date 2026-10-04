import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
