import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificationModule } from '../verification/verification.module';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { SlotExpiryService } from './slot-expiry.service';

@Module({
  imports: [PrismaModule, NotificationsModule, VerificationModule],
  controllers: [ShopController],
  providers: [ShopService, SlotExpiryService],
})
export class ShopModule {}
