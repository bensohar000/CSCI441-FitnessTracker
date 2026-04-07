import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { eq, sql } from 'drizzle-orm';
import { env } from '@server/config/env.js';
import { DbClient, getDrizzleDb } from '@server/db/drizzle.js';
import { users } from '@server/db/schema.js';
import { ClientError } from '@server/lib/client-error.js';

type SessionUser = {
  userId: number;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  uiHighContrast: boolean;
  uiTextSize: string;
};

export type AuthTokenPayload = { userId: number };

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

/** Sign a short-lived access token used by protected API routes. */
export function signAccessToken(userId: number): string {
  return jwt.sign({ userId } satisfies AuthTokenPayload, env.TOKEN_SECRET, {
    expiresIn: '7d',
  });
}

/** Normalize DB row shape to the session payload shape used by controllers. */
function toSessionUser(row: {
  userId: number;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  uiHighContrast: boolean;
  uiTextSize: string;
}): SessionUser {
  return {
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    isGuest: row.isGuest,
    uiHighContrast: row.uiHighContrast,
    uiTextSize: row.uiTextSize,
  };
}

/** Create a guest identity and issue a JWT for demo access. */
export async function createGuestSession(): Promise<{
  token: string;
  user: SessionUser;
}> {
  const db = requireDb();
  const id = randomUUID();
  const authSubject = `guest:${id}`;
  const displayName = `Guest ${id.slice(0, 8)}`;

  const [created] = await db
    .insert(users)
    .values({
      authSubject,
      displayName,
      isGuest: true,
    })
    .returning({
      userId: users.userId,
      email: users.email,
      displayName: users.displayName,
      isGuest: users.isGuest,
      uiHighContrast: users.uiHighContrast,
      uiTextSize: users.uiTextSize,
    });

  if (!created) throw new ClientError(500, 'failed to create guest session');
  return {
    token: signAccessToken(created.userId),
    user: toSessionUser(created),
  };
}

/** Validate email/password credentials and issue a JWT on success. */
export async function signInUser(
  email: string,
  password: string,
): Promise<{ token: string; user: SessionUser }> {
  const db = requireDb();
  const [found] = await db
    .select({
      userId: users.userId,
      email: users.email,
      displayName: users.displayName,
      isGuest: users.isGuest,
      passwordHash: users.passwordHash,
      uiHighContrast: users.uiHighContrast,
      uiTextSize: users.uiTextSize,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!found?.passwordHash) {
    throw new ClientError(401, 'invalid email or password');
  }
  const isValid = await argon2.verify(found.passwordHash, password);
  if (!isValid) {
    throw new ClientError(401, 'invalid email or password');
  }

  return {
    token: signAccessToken(found.userId),
    user: toSessionUser(found),
  };
}

/** Load current user profile fields used by the client app shell. */
export async function readMe(userId: number): Promise<SessionUser> {
  const db = requireDb();
  const [row] = await db
    .select({
      userId: users.userId,
      email: users.email,
      displayName: users.displayName,
      isGuest: users.isGuest,
      uiHighContrast: users.uiHighContrast,
      uiTextSize: users.uiTextSize,
    })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  if (!row) throw new ClientError(404, 'user not found');
  return toSessionUser(row);
}

/** Persist accessibility preferences for the authenticated user. */
export async function updateMyPreferences(
  userId: number,
  prefs: { uiHighContrast?: boolean; uiTextSize?: 'normal' | 'large' },
): Promise<SessionUser> {
  const db = requireDb();
  const [updated] = await db
    .update(users)
    .set({
      uiHighContrast: prefs.uiHighContrast,
      uiTextSize: prefs.uiTextSize,
      updatedAt: sql`now()`,
    })
    .where(eq(users.userId, userId))
    .returning({
      userId: users.userId,
      email: users.email,
      displayName: users.displayName,
      isGuest: users.isGuest,
      uiHighContrast: users.uiHighContrast,
      uiTextSize: users.uiTextSize,
    });
  if (!updated) throw new ClientError(404, 'user not found');
  return toSessionUser(updated);
}
