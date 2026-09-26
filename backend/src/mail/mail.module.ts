import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';
import { MailService } from './mail.service';
import { OtpService } from './otp.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [MailService, OtpService],
  exports: [MailService, OtpService],
})
export class MailModule {}
