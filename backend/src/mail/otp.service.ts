import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { OtpPurpose } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async issueOtp(email: string, purpose: OtpPurpose) {
    const normalizedEmail = email.trim().toLowerCase();

    const latest = await this.prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (
      latest &&
      Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'Please wait a moment before requesting another code.',
      );
    }

    // Invalidate previous unused codes for this purpose.
    await this.prisma.emailOtp.updateMany({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        purpose,
        codeHash,
        expiresAt,
      },
    });

    const delivery = await this.mailService.sendOtpEmail({
      to: normalizedEmail,
      purpose,
      code,
    });

    return {
      email: normalizedEmail,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      deliveryMode: delivery.mode,
    };
  }

  async verifyOtp(email: string, purpose: OtpPurpose, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      throw new BadRequestException('OTP must be a 6-digit code.');
    }

    const record = await this.prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new UnauthorizedException('No active verification code found.');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await this.prisma.emailOtp.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw new UnauthorizedException(
        'This code has expired. Request a new one.',
      );
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.emailOtp.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Too many incorrect attempts. Request a new code.',
      );
    }

    const matches = await bcrypt.compare(trimmedCode, record.codeHash);

    if (!matches) {
      await this.prisma.emailOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid verification code.');
    }

    await this.prisma.emailOtp.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    return { email: normalizedEmail };
  }
}
