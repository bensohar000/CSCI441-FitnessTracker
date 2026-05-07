/**
 * Security Audit Logger Middleware
 *
 * Logs security-relevant events in a structured format compatible with
 * the existing pino logger already used by the app (pino-http).
 *
 * Captures:
 *  - Every incoming request with method, path, and IP
 *  - Outgoing response status code and latency
 *  - Warn level on 401/403 (auth failures)
 *  - userId from the authenticated session when available
 */

import type { Request, Response, NextFunction } from 'express';

export function auditLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();

  res.on('finish', () => {
    const latencyMs = Date.now() - startedAt;
    const statusCode = res.statusCode;

    const entry = {
      audit: true,
      method: req.method,
      path: req.path,
      statusCode,
      latencyMs,
      ip: req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress,
      userId: (req as any).user?.userId ?? null,
    };

    // Use req.log if pino-http attached it, otherwise fall back to console
    const logger = (req as any).log;
    if (logger) {
      if (statusCode === 401 || statusCode === 403) {
        logger.warn(entry, 'security: auth failure');
      } else {
        logger.info(entry, 'audit: request completed');
      }
    } else {
      if (statusCode === 401 || statusCode === 403) {
        console.warn('[audit] security: auth failure', entry);
      } else {
        console.log('[audit] request completed', entry);
      }
    }
  });

  next();
}
