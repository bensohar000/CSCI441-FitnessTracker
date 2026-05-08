/**
 * Request Size Limiter Middleware
 *
 * Rejects requests whose Content-Length exceeds a defined threshold
 * before the body is parsed. This protects against payload flooding
 * attacks where an attacker sends an oversized JSON body to exhaust
 * server memory or CPU.
 *
 */

import type { Request, Response, NextFunction } from 'express';

const MAX_BODY_BYTES = 50 * 1024; // 50 KB — plenty for any legitimate API payload

export function requestSizeLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);

  if (contentLength > MAX_BODY_BYTES) {
    res.status(413).json({
      error: {
        code: 'payload_too_large',
        message: `Request body must not exceed ${MAX_BODY_BYTES / 1024} KB.`,
      },
    });
    return;
  }

  next();
}
