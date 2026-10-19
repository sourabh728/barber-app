import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

type RequestUser = {
  userId?: string;
  email?: string;
  role?: string;
};

/**
 * Logs every HTTP request to stdout (visible in Render logs) with who did what.
 * User is filled in after JWT auth when the response finishes.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const started = Date.now();
    const method = req.method;
    const path = req.originalUrl || req.url;

    // Skip noisy probes
    if (path === '/health' || path === '/') {
      next();
      return;
    }

    res.on('finish', () => {
      const user = (req as Request & { user?: RequestUser }).user;
      const who = user?.email
        ? `${user.role ?? 'USER'} <${user.email}> id=${user.userId ?? '?'}`
        : 'anonymous (no auth)';
      const ms = Date.now() - started;
      const line = `${method} ${path} → ${res.statusCode} ${ms}ms | ${who}`;

      if (res.statusCode >= 500) {
        this.logger.error(line);
      } else if (res.statusCode >= 400) {
        this.logger.warn(line);
      } else {
        this.logger.log(line);
      }
    });

    next();
  }
}
