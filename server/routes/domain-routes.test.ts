import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Express } from 'express';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGuestSession,
  signInUser,
} from '@server/services/auth-service.js';
import {
  assertExerciseAssignableToUser,
  deleteCustomExercise,
  updateCustomExercise,
} from '@server/services/exercise-service.js';
import {
  createWorkout,
  listWorkouts,
} from '@server/services/workout-service.js';

vi.mock('@server/services/auth-service.js', () => ({
  createGuestSession: vi.fn(),
  signInUser: vi.fn(),
  readMe: vi.fn(),
  updateMyPreferences: vi.fn(),
}));

vi.mock('@server/services/workout-service.js', () => ({
  listWorkouts: vi.fn(),
  createWorkout: vi.fn(),
  updateWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
}));

vi.mock('@server/services/exercise-service.js', () => ({
  listExercises: vi.fn(),
  createCustomExercise: vi.fn(),
  updateCustomExercise: vi.fn(),
  deleteCustomExercise: vi.fn(),
  assertExerciseAssignableToUser: vi.fn(),
}));

function signedToken(userId: number): string {
  return jwt.sign({ userId }, process.env.TOKEN_SECRET ?? 'test-token-secret');
}

describe('domain route behavior', () => {
  let app: Express;

  beforeAll(async () => {
    process.env.TOKEN_SECRET = process.env.TOKEN_SECRET ?? 'test-token-secret';
    const { createApp } = await import('@server/app.js');
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates guest session via POST /api/auth/guest', async () => {
    vi.mocked(createGuestSession).mockResolvedValue({
      token: 'guest-token',
      user: {
        userId: 10,
        email: null,
        displayName: 'Guest 1234',
        isGuest: true,
        uiHighContrast: false,
        uiTextSize: 'normal',
      },
    });

    const res = await request(app).post('/api/auth/guest').expect(201);
    expect(vi.mocked(createGuestSession)).toHaveBeenCalledTimes(1);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        token: 'guest-token',
      }),
    );
  });

  it('signs in user via POST /api/auth/sign-in', async () => {
    vi.mocked(signInUser).mockResolvedValue({
      token: 'user-token',
      user: {
        userId: 2,
        email: 'user@example.com',
        displayName: 'Demo User',
        isGuest: false,
        uiHighContrast: false,
        uiTextSize: 'normal',
      },
    });

    const res = await request(app)
      .post('/api/auth/sign-in')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200);

    expect(vi.mocked(signInUser)).toHaveBeenCalledWith(
      'user@example.com',
      'password123',
    );
    expect(res.body.data.token).toBe('user-token');
  });

  it('lists workouts for token user via GET /api/workouts', async () => {
    vi.mocked(listWorkouts).mockResolvedValue([
      {
        workoutId: 1,
        userId: 7,
        title: 'Upper Day',
        notes: null,
        exerciseTypeId: null,
        startedAt: new Date('2026-04-01T12:00:00.000Z'),
        endedAt: null,
        durationMinutes: null,
        createdAt: new Date('2026-04-01T12:00:00.000Z'),
        updatedAt: new Date('2026-04-01T12:00:00.000Z'),
      },
    ]);

    const token = signedToken(7);
    const res = await request(app)
      .get('/api/workouts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(vi.mocked(listWorkouts)).toHaveBeenCalledWith(7);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        workoutId: 1,
        title: 'Upper Day',
      }),
    );
  });

  it('creates workout and checks exercise assignability', async () => {
    vi.mocked(assertExerciseAssignableToUser).mockResolvedValue();
    vi.mocked(createWorkout).mockResolvedValue({
      workoutId: 3,
      userId: 4,
      title: 'Leg Day',
      notes: 'Heavy squats',
      exerciseTypeId: 12,
      startedAt: new Date('2026-04-01T10:00:00.000Z'),
      endedAt: null,
      durationMinutes: null,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    });

    const token = signedToken(4);
    await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Leg Day', notes: 'Heavy squats', exerciseTypeId: 12 })
      .expect(201);

    expect(vi.mocked(assertExerciseAssignableToUser)).toHaveBeenCalledWith(
      4,
      12,
    );
    expect(vi.mocked(createWorkout)).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        title: 'Leg Day',
        exerciseTypeId: 12,
      }),
    );
  });

  it('updates and deletes custom exercise for token user', async () => {
    vi.mocked(updateCustomExercise).mockResolvedValue({
      exerciseTypeId: 22,
      userId: 8,
      name: 'Row Variation',
      muscleGroup: null,
      category: 'resistance',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    vi.mocked(deleteCustomExercise).mockResolvedValue();

    const token = signedToken(8);
    await request(app)
      .patch('/api/exercises/22')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Row Variation' })
      .expect(200);

    await request(app)
      .delete('/api/exercises/22')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    expect(vi.mocked(updateCustomExercise)).toHaveBeenCalledWith(
      8,
      22,
      expect.objectContaining({ name: 'Row Variation' }),
    );
    expect(vi.mocked(deleteCustomExercise)).toHaveBeenCalledWith(8, 22);
  });
});
