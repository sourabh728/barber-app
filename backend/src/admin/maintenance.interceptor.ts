import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { Observable } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Blocks non-admin authenticated API traffic when maintenance mode is on.
 * Auth + public settings remain available so clients can show the banner / login.
 */
@Injectable()
export class MaintenanceInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<{
      method?: string;
      path?: string;
      url?: string;
      user?: { role?: UserRole };
    }>();

    const path = (req.path || req.url || '').split('?')[0];
    const allowlisted =
      path.startsWith('/auth') ||
      path.startsWith('/settings') ||
      path === '/health' ||
      path === '/';

    if (allowlisted) {
      return next.handle();
    }

    if (req.user?.role === UserRole.ADMIN) {
      return next.handle();
    }

    const settings = await this.prisma.appSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings?.maintenanceEnabled) {
      return next.handle();
    }

    if (
      settings.maintenanceUntil &&
      settings.maintenanceUntil.getTime() < Date.now()
    ) {
      // Auto-expire stale maintenance window.
      await this.prisma.appSettings.update({
        where: { id: 'default' },
        data: { maintenanceEnabled: false, maintenanceUntil: null },
      });
      return next.handle();
    }

    throw new ServiceUnavailableException({
      code: 'MAINTENANCE',
      message: settings.maintenanceMessage,
      until: settings.maintenanceUntil?.toISOString() ?? null,
    });
  }
}
