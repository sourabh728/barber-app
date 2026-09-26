import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? '587');
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    // Gmail app passwords are often copied with spaces — strip them.
    const pass = this.configService
      .get<string>('SMTP_PASS')
      ?.replace(/\s+/g, '')
      .trim();

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP ready: host=${host} port=${port} user=${user}`);
    } else {
      this.transporter = null;
      const missing = [
        !host ? 'SMTP_HOST' : null,
        !user ? 'SMTP_USER' : null,
        !pass ? 'SMTP_PASS' : null,
      ].filter(Boolean);
      this.logger.warn(
        `SMTP is not configured (missing ${missing.join(', ')}). OTPs will be logged to the server console only.`,
      );
    }
  }

  async sendOtpEmail(params: {
    to: string;
    purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET';
    code: string;
  }) {
    const from =
      this.configService.get<string>('SMTP_FROM')?.trim() ||
      this.configService.get<string>('SMTP_USER')?.trim() ||
      'noreply@barber-app.local';

    const subject =
      params.purpose === 'EMAIL_VERIFY'
        ? 'Verify your BookUrBarber email'
        : 'Reset your BookUrBarber password';

    const action =
      params.purpose === 'EMAIL_VERIFY'
        ? 'verify your email address'
        : 'reset your password';

    const text = [
      `Your BookUrBarber verification code is ${params.code}.`,
      `Use this code to ${action}.`,
      'This code expires in 10 minutes.',
      'If you did not request this, you can ignore this email.',
    ].join('\n');

    const html = `
      <p>Your BookUrBarber verification code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${params.code}</p>
      <p>Use this code to ${action}. It expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    if (!this.transporter) {
      this.logger.log(
        `[DEV OTP] purpose=${params.purpose} to=${params.to} code=${params.code}`,
      );
      return { delivered: false as const, mode: 'console' as const };
    }

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject,
        text,
        html,
      });
      this.logger.log(
        `OTP email sent via SMTP to=${params.to} purpose=${params.purpose}`,
      );
      return { delivered: true as const, mode: 'smtp' as const };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send OTP email to=${params.to}: ${details}`);
      this.logger.log(
        `[DEV OTP FALLBACK] purpose=${params.purpose} to=${params.to} code=${params.code}`,
      );
      return { delivered: false as const, mode: 'console' as const };
    }
  }
}
