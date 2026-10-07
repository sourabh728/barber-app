import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Lightweight readiness probe for Render health checks. */
  @Get('health')
  health() {
    return { ok: true };
  }
}
