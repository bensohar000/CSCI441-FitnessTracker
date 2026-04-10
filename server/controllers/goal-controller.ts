import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '@server/lib/http-response.js';
import { requireUserId } from '@server/lib/request-user.js';
import { ClientError } from '@server/lib/client-error.js';
import {
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
} from '@server/services/goal-service.js';

const userIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const goalIdParams = z.object({
  id: z.coerce.number().int().positive(),
  goalId: z.coerce.number().int().positive(),
});

const intervalLike = z
  .string()
  .regex(/^\d{2}:\d{2}:\d{2}$/, 'targetTime must be HH:MM:SS')
  .nullable();

const createGoalBody = z
  .object({
    exerciseType: z.coerce.number().int().positive().nullable().optional(),
    targetWeight: z.coerce.number().positive().nullable().optional(),
    targetTime: intervalLike.optional(),
    targetDistance: z.coerce.number().positive().nullable().optional(),
  })
  .refine(
    (body) =>
      body.targetWeight != null ||
      body.targetTime != null ||
      body.targetDistance != null,
    { message: 'at least one target field is required' },
  );

const patchGoalBody = z
  .object({
    exerciseType: z.coerce.number().int().positive().nullable().optional(),
    targetWeight: z.coerce.number().positive().nullable().optional(),
    targetTime: intervalLike.optional(),
    targetDistance: z.coerce.number().positive().nullable().optional(),
  })
  .refine(
    (body) =>
      body.targetWeight != null ||
      body.targetTime != null ||
      body.targetDistance != null,
    { message: 'at least one target field is required' },
  );

function assertSelfOnlyRoute(pathUserId: number, authUserId: number): void {
  if (pathUserId !== authUserId) {
    throw new ClientError(403, 'forbidden');
  }
}

function toDecimalString(
  value: number | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return String(value);
}

function serializeGoal(g: {
  id: number;
  userId: number;
  targetWeight: string | null;
  exerciseType: number | null;
  targetTime: string | null;
  targetDistance: string | null;
}): {
  id: number;
  userId: number;
  exerciseType: number | null;
  targetWeight: string | null;
  targetTime: string | null;
  targetDistance: string | null;
} {
  return {
    id: g.id,
    userId: g.userId,
    exerciseType: g.exerciseType,
    targetWeight: g.targetWeight,
    targetTime: g.targetTime,
    targetDistance: g.targetDistance,
  };
}

/** GET /api/user/:id/goals */
export async function getGoals(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { id } = userIdParams.parse(req.params);
    assertSelfOnlyRoute(id, authUserId);

    const rows = await listGoals(authUserId);
    sendSuccess(
      res,
      rows.map((row) => serializeGoal(row)),
    );
  } catch (err) {
    next(err);
  }
}

/** POST /api/user/:id/goals */
export async function postGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { id } = userIdParams.parse(req.params);
    assertSelfOnlyRoute(id, authUserId);

    const body = createGoalBody.parse(req.body);
    const created = await createGoal(authUserId, {
      exerciseType: body.exerciseType,
      targetWeight: toDecimalString(body.targetWeight),
      targetTime: body.targetTime,
      targetDistance: toDecimalString(body.targetDistance),
    });
    sendSuccess(res, serializeGoal(created), 201);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/user/:id/goals/:goalId */
export async function patchGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { id, goalId } = goalIdParams.parse(req.params);
    assertSelfOnlyRoute(id, authUserId);

    const body = patchGoalBody.parse(req.body);
    const updated = await updateGoal(authUserId, goalId, {
      exerciseType: body.exerciseType,
      targetWeight: toDecimalString(body.targetWeight),
      targetTime: body.targetTime,
      targetDistance: toDecimalString(body.targetDistance),
    });
    sendSuccess(res, serializeGoal(updated));
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/user/:id/goals/:goalId */
export async function removeGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { id, goalId } = goalIdParams.parse(req.params);
    assertSelfOnlyRoute(id, authUserId);

    await deleteGoal(authUserId, goalId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
