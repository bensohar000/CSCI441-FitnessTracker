/**
 * Input Sanitization Middleware
 *
 * Strips dangerous characters from string fields in req.body, req.query,
 * and req.params before they reach controllers.
 *
 * Defense-in-depth alongside Zod validation. Handles character-level
 * hygiene to reduce XSS and injection surface area.
 *
 */

import type { Request, Response, NextFunction } from 'express';

function sanitizeString(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && value !== undefined && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

function sanitizeObjectInPlace(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    obj[key] = sanitizeValue(obj[key]);
  }
}

export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    if (
      req.body !== null &&
      req.body !== undefined &&
      typeof req.body === 'object'
    ) {
      req.body = sanitizeValue(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      sanitizeObjectInPlace(req.query as Record<string, unknown>);
    }

    if (req.params && typeof req.params === 'object') {
      sanitizeObjectInPlace(req.params as Record<string, unknown>);
    }
  } catch (err) {
    console.error('[sanitizeInput] error during sanitization:', err);
  }

  next();
}
