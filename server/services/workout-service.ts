import { and, desc, eq, sql } from 'drizzle-orm';
import { DbClient, getDrizzleDb } from '@server/db/drizzle.js';
import { workouts } from '@server/db/schema.js';
import { ClientError } from '@server/lib/client-error.js';

/** Return configured DB client or fail with setup guidance. */
function requireDb(): DbClient {
  const db = getDrizzleDb();
  if (!db) {
    throw new ClientError(
      503,
      'database is not configured. set DATABASE_URL and run migrations.',
    );
  }
  return db;
}

export type WorkoutRecord = {
  workoutId: number;
  userId: number;
  title: string;
  notes: string | null;
  exerciseTypeId: number | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
  date: Date | null;
  userWeight: string | null;
  reps: number | null;
};

/** List workouts for one owner, newest first. */
export async function listWorkouts(userId: number): Promise<WorkoutRecord[]> {
  const db = requireDb();
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.startedAt));
}

/** Insert a new workout owned by `userId`. */
export async function createWorkout(
  userId: number,
  input: {
    title: string;
    notes?: string | null;
    exerciseTypeId?: number | null;
    startedAt?: Date;
    endedAt?: Date | null;
    durationMinutes?: number | null;
  },
): Promise<WorkoutRecord> {
  const db = requireDb();
  const [created] = await db
    .insert(workouts)
    .values({
      userId,
      title: input.title,
      notes: input.notes ?? null,
      exerciseTypeId: input.exerciseTypeId ?? null,
      startedAt: input.startedAt ?? new Date(),
      endedAt: input.endedAt ?? null,
      durationMinutes: input.durationMinutes ?? null,
    })
    .returning();
  return created;
}

/** Patch mutable fields on a user-owned workout. */
export async function updateWorkout(
  userId: number,
  workoutId: number,
  input: {
    title?: string;
    notes?: string | null;
    exerciseTypeId?: number | null;
    startedAt?: Date;
    endedAt?: Date | null;
    durationMinutes?: number | null;
  },
): Promise<WorkoutRecord> {
  const db = requireDb();
  const [updated] = await db
    .update(workouts)
    .set({
      title: input.title,
      notes: input.notes,
      exerciseTypeId: input.exerciseTypeId,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMinutes: input.durationMinutes,
      updatedAt: sql`now()`,
    })
    .where(and(eq(workouts.workoutId, workoutId), eq(workouts.userId, userId)))
    .returning();
  if (!updated) throw new ClientError(404, 'workout not found');
  return updated;
}

/** Delete a user-owned workout; 404 if not found for caller. */
export async function deleteWorkout(
  userId: number,
  workoutId: number,
): Promise<void> {
  const db = requireDb();
  const [removed] = await db
    .delete(workouts)
    .where(and(eq(workouts.workoutId, workoutId), eq(workouts.userId, userId)))
    .returning({ workoutId: workouts.workoutId });
  if (!removed) throw new ClientError(404, 'workout not found');
}
