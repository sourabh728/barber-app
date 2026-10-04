import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
