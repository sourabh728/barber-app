import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MaintenanceInterceptor } from './maintenance.interceptor';
import { PublicSettingsController } from './public-settings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, PublicSettingsController],
  providers: [
    AdminService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MaintenanceInterceptor,
    },
  ],
  exports: [AdminService],
})
export class AdminModule {}
