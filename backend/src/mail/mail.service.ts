import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as dnsPromises, setDefaultResultOrder } from 'node:dns';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Prefer A records globally; Render free outbound often has no working IPv6.
try {
  setDefaultResultOrder('ipv4first');
} catch {
  // Older Node builds may not expose this helper.
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporterPromise: Promise<Transporter | null> | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter() {
    if (!this.transporterPromise) {
      this.transporterPromise = this.createTransporter();
    }
    return this.transporterPromise;
  }

  private async createTransporter(): Promise<Transporter | null> {
    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? '587');
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    // Gmail app passwords are often copied with spaces — strip them.
    const pass = this.configService
      .get<string>('SMTP_PASS')
      ?.replace(/\s+/g, '')
      .trim();

    if (!host || !user || !pass) {
      const missing = [
        !host ? 'SMTP_HOST' : null,
        !user ? 'SMTP_USER' : null,
        !pass ? 'SMTP_PASS' : null,
      ].filter(Boolean);
      this.logger.warn(
        `SMTP is not configured (missing ${missing.join(', ')}). OTPs will be logged to the server console only.`,
      );
      return null;
    }

    // Resolve to IPv4 up front. Nodemailer may still pick Gmail AAAA on Render,
    // which fails with ENETUNREACH (no outbound IPv6).
    let connectHost = host;
    try {
      const ipv4 = await dnsPromises.resolve4(host);
      if (ipv4[0]) {
        connectHost = ipv4[0];
        this.logger.log(`SMTP DNS IPv4: ${host} -> ${connectHost}`);
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `SMTP IPv4 lookup failed for ${host} (${details}); using hostname as-is`,
      );
    }

    const transporter = nodemailer.createTransport({
      host: connectHost,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Keep TLS SNI / cert validation against the real hostname.
      tls: { servername: host },
      name: host,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });

    this.logger.log(
      `SMTP ready: host=${host} connect=${connectHost} port=${port} user=${user}`,
    );
    return transporter;
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
        ? 'Verify your Trimshim email'
        : 'Reset your Trimshim password';

    const action =
      params.purpose === 'EMAIL_VERIFY'
        ? 'verify your email address'
        : 'reset your password';

    const text = [
      `Your Trimshim verification code is ${params.code}.`,
      `Use this code to ${action}.`,
      'This code expires in 10 minutes.',
      'If you did not request this, you can ignore this email.',
    ].join('\n');

    const html = `
      <p>Your Trimshim verification code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${params.code}</p>
      <p>Use this code to ${action}. It expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    const transporter = await this.getTransporter();
    if (!transporter) {
      this.logger.log(
        `[DEV OTP] purpose=${params.purpose} to=${params.to} code=${params.code}`,
      );
      return { delivered: false as const, mode: 'console' as const };
    }

    try {
      await transporter.sendMail({
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
