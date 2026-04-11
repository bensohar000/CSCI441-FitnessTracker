import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '@server/lib/http-response.js';
import { requireUserId } from '@server/lib/request-user.js';
import { ClientError } from '@server/lib/client-error.js';
import {
  createUserProfile,
  deleteUserProfile,
  readUserProfile,
  replaceUserProfile,
  updateUserProfile,
} from '@server/services/profile-service.js';

const userIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const createProfileBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().nullable().optional(),
  password: z.string().min(8).max(200).optional(),
  height: z.coerce.number().int().positive().max(300).nullable().optional(),
  payment_info: z.string().trim().max(255).nullable().optional(),
});

const putProfileBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().nullable().optional(),
  password: z.string().min(8).max(200).optional(),
  height: z.coerce.number().int().positive().max(300).nullable().optional(),
  payment_info: z.string().trim().max(255).nullable().optional(),
});

const patchProfileBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().nullable().optional(),
  password: z.string().min(8).max(200).optional(),
  height: z.coerce.number().int().positive().max(300).nullable().optional(),
  payment_info: z.string().trim().max(255).nullable().optional(),
});

function assertSelfOnlyRoute(pathUserId: number, authUserId: number): void {
  if (pathUserId !== authUserId) {
    throw new ClientError(403, 'forbidden');
  }
}

function serializeProfile(p: {
  userId: number;
  displayName: string;
  email: string | null;
  passwordHash: string | null;
  height: number | null;
  paymentInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
}): {
  id: number;
  name: string;
  email: string | null;
  password: string | null;
  height: number | null;
  payment_info: string | null;
  created_at: string;
  updated_at: string;
} {
  return {
    id: p.userId,
    name: p.displayName,
    email: p.email,
    password: p.passwordHash,
    height: p.height,
    payment_info: p.paymentInfo,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

function bodyToServiceInput(body: {
  name?: string;
  email?: string | null;
  password?: string;
  height?: number | null;
  payment_info?: string | null;
}): {
  displayName?: string;
  email?: string | null;
  passwordPlain?: string;
  height?: number | null;
  paymentInfo?: string | null;
} {
  return {
    ...(body.name !== undefined ? { displayName: body.name } : {}),
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.password !== undefined ? { passwordPlain: body.password } : {}),
    ...(body.height !== undefined ? { height: body.height } : {}),
    ...(body.payment_info !== undefined
      ? { paymentInfo: body.payment_info }
      : {}),
  };
}

/** GET /api/user/:id/profile */
export async function getUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { id } = userIdParams.parse(req.params);
    assertSelfOnlyRoute(id, authUserId);

    const row = await readUserProfile(authUserId);
    sendSuccess(res, serializeProfile(row));
  } catch (err) {
    next(err);
  }
}

/** POST /api/user/:id/profile */
export async function postUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { id } = userIdParams.parse(req.params);
    assertSelfOnlyRoute(id, authUserId);

    const body = createProfileBody.parse(req.body);
    const row = await createUserProfile(authUserId, {
      displayName: body.name,
      email: body.email,
      passwordPlain: body.password,
      height: body.height,
      paymentInfo: body.payment_info,
    });
    sendSuccess(res, serializeProfile(row), 201);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/user/:id/profile */
export async function putUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { id } = userIdParams.parse(req.params);
    assertSelfOnlyRoute(id, authUserId);

    const body = putProfileBody.parse(req.body);
    const row = await replaceUserProfile(authUserId, {
      displayName: body.name,
      email: body.email,
      passwordPlain: body.password,
      height: body.height,
      paymentInfo: body.payment_info,
    });
    sendSuccess(res, serializeProfile(row));
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/user/:id/profile */
export async function patchUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { id } = userIdParams.parse(req.params);
    assertSelfOnlyRoute(id, authUserId);

    const body = patchProfileBody.parse(req.body);
    const row = await updateUserProfile(authUserId, bodyToServiceInput(body));
    sendSuccess(res, serializeProfile(row));
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/user/:id/profile */
export async function removeUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { id } = userIdParams.parse(req.params);
    assertSelfOnlyRoute(id, authUserId);

    await deleteUserProfile(authUserId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
