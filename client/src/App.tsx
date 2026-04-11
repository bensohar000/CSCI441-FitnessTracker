import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
} from '@shared/api-contracts';

type UiTextSize = 'normal' | 'large';

type User = {
  userId: number;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  uiHighContrast: boolean;
  uiTextSize: UiTextSize;
  height: number | null;
  paymentInfo: string | null;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
};

type Exercise = {
  exerciseTypeId: number;
  userId: number | null;
  isCustom: boolean;
  name: string;
  muscleGroup: string | null;
  category: string;
  createdAt: string;
};

type Workout = {
  workoutId: number;
  userId: number;
  title: string;
  notes: string | null;
  exerciseTypeId: number | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

const tokenKey = 'wtmini.token';

/** Fetch helper that enforces JSON envelope handling for API calls. */
async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => null)) as ApiErrorEnvelope | null;
    throw new Error(getApiErrorMessage(response.status, errorBody));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const envelope = (await response.json()) as ApiSuccessEnvelope<T>;
  return envelope.data;
}

/** Convert ISO timestamp to local input-friendly datetime text. */
function toLocalDateTime(isoValue: string): string {
  const date = new Date(isoValue);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60000);
  return adjusted.toISOString().slice(0, 16);
}

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(tokenKey),
  );
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(
    null,
  );
  const [editingExerciseName, setEditingExerciseName] = useState('');

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [exerciseTypeId, setExerciseTypeId] = useState<number | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editExerciseTypeId, setEditExerciseTypeId] = useState<number | null>(
    null,
  );

  const textSizeClass =
    user?.uiTextSize === 'large' ? 'text-lg leading-8' : 'text-base leading-7';
  const highContrastClass = user?.uiHighContrast
    ? 'bg-black text-white'
    : 'bg-slate-50 text-slate-900';

  async function loadMe(currentToken: string): Promise<User> {
    return fetchJson<User>('/api/me', undefined, currentToken);
  }

  async function loadExercises(currentToken: string): Promise<Exercise[]> {
    return fetchJson<Exercise[]>('/api/exercises', undefined, currentToken);
  }

  async function loadWorkouts(currentToken: string): Promise<Workout[]> {
    return fetchJson<Workout[]>('/api/workouts', undefined, currentToken);
  }

  // Hydrate authenticated state when a token exists.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const [me, nextExercises, nextWorkouts] = await Promise.all([
          loadMe(token),
          loadExercises(token),
          loadWorkouts(token),
        ]);
        if (cancelled) return;
        setUser(me);
        setExercises(nextExercises);
        setWorkouts(nextWorkouts);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'failed to hydrate user';
        setErrorMessage(message);
        localStorage.removeItem(tokenKey);
        setToken(null);
        setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const sortedExercises = useMemo(
    () => [...exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises],
  );

  /** One-click guest auth for demo mode. */
  async function loginAsGuest(): Promise<void> {
    try {
      setErrorMessage('');
      const session = await fetchJson<{ token: string; user: User }>(
        '/api/auth/guest',
        { method: 'POST' },
      );
      localStorage.setItem(tokenKey, session.token);
      setToken(session.token);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'guest login failed',
      );
    }
  }

  /** Email/password sign-in for seeded or registered users. */
  async function signIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      setErrorMessage('');
      const session = await fetchJson<{ token: string; user: User }>(
        '/api/auth/sign-in',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );
      localStorage.setItem(tokenKey, session.token);
      setToken(session.token);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'sign in failed');
    }
  }

  /** Persist accessibility preferences and refresh local user state. */
  async function updatePreferences(input: {
    uiHighContrast?: boolean;
    uiTextSize?: UiTextSize;
  }): Promise<void> {
    if (!token) return;
    try {
      const updated = await fetchJson<User>(
        '/api/me/preferences',
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
        token,
      );
      setUser(updated);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to update preferences',
      );
    }
  }

  /** Create a custom exercise row for the authenticated user. */
  async function addCustomExercise(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!token || !newExerciseName.trim()) return;
    try {
      const created = await fetchJson<Exercise>(
        '/api/exercises',
        {
          method: 'POST',
          body: JSON.stringify({ name: newExerciseName.trim() }),
        },
        token,
      );
      setExercises((prev) => [...prev, created]);
      setNewExerciseName('');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to create exercise',
      );
    }
  }

  /** Rename a custom exercise in-place. */
  async function saveExerciseName(exerciseTypeId: number): Promise<void> {
    if (!token || !editingExerciseName.trim()) return;
    try {
      const updated = await fetchJson<Exercise>(
        `/api/exercises/${exerciseTypeId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: editingExerciseName.trim() }),
        },
        token,
      );
      setExercises((prev) =>
        prev.map((item) =>
          item.exerciseTypeId === exerciseTypeId ? updated : item,
        ),
      );
      setEditingExerciseId(null);
      setEditingExerciseName('');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to update exercise',
      );
    }
  }

  /** Delete one custom exercise by identifier. */
  async function deleteExercise(exerciseTypeId: number): Promise<void> {
    if (!token) return;
    try {
      await fetchJson<void>(
        `/api/exercises/${exerciseTypeId}`,
        {
          method: 'DELETE',
        },
        token,
      );
      setExercises((prev) =>
        prev.filter((item) => item.exerciseTypeId !== exerciseTypeId),
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to delete exercise',
      );
    }
  }

  /** Create a workout from the form draft. */
  async function addWorkout(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token || !title.trim()) return;
    try {
      const created = await fetchJson<Workout>(
        '/api/workouts',
        {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            notes: notes.trim() || null,
            exerciseTypeId,
          }),
        },
        token,
      );
      setWorkouts((prev) => [created, ...prev]);
      setTitle('');
      setNotes('');
      setExerciseTypeId(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to create workout',
      );
    }
  }

  /** Save edits for a selected workout card. */
  async function saveWorkout(workoutId: number): Promise<void> {
    if (!token || !editTitle.trim()) return;
    try {
      const updated = await fetchJson<Workout>(
        `/api/workouts/${workoutId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: editTitle.trim(),
            notes: editNotes.trim() || null,
            exerciseTypeId: editExerciseTypeId,
          }),
        },
        token,
      );
      setWorkouts((prev) =>
        prev.map((item) => (item.workoutId === workoutId ? updated : item)),
      );
      setEditingWorkoutId(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to update workout',
      );
    }
  }

  /** Delete one workout and remove it from local list state. */
  async function deleteWorkoutById(workoutId: number): Promise<void> {
    if (!token) return;
    try {
      await fetchJson<void>(
        `/api/workouts/${workoutId}`,
        {
          method: 'DELETE',
        },
        token,
      );
      setWorkouts((prev) =>
        prev.filter((item) => item.workoutId !== workoutId),
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to delete workout',
      );
    }
  }

  /** Clear local session and reset authenticated UI state. */
  function logout(): void {
    localStorage.removeItem(tokenKey);
    setToken(null);
    setUser(null);
    setExercises([]);
    setWorkouts([]);
  }

  return (
    <main
      className={`min-h-screen px-6 py-8 ${highContrastClass} ${textSizeClass}`}>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Workout Tracker Mini</h1>
          <p className="opacity-80">
            Minimal demo: JWT auth, workouts CRUD, custom exercises, and basic
            accessibility.
          </p>
        </header>

        {errorMessage ? (
          <p className="rounded border border-red-400 bg-red-50 p-3 text-red-800">
            {errorMessage}
          </p>
        ) : null}

        {!user ? (
          <section className="space-y-4 rounded border p-4">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <form className="flex flex-col gap-3" onSubmit={signIn}>
              <label className="flex flex-col gap-1">
                <span>Email</span>
                <input
                  className="rounded border px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Password</span>
                <input
                  className="rounded border px-3 py-2"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="flex gap-3">
                <button
                  className="rounded bg-blue-700 px-4 py-2 text-white"
                  type="submit">
                  Sign in
                </button>
                <button
                  className="rounded bg-slate-700 px-4 py-2 text-white"
                  type="button"
                  onClick={loginAsGuest}>
                  Continue as guest
                </button>
              </div>
            </form>
            <p className="text-sm opacity-80">
              Demo seeded user: <code>user@example.com / password123</code>
            </p>
          </section>
        ) : (
          <>
            <section className="space-y-3 rounded border p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {user.displayName} {user.isGuest ? '(Guest)' : ''}
                </h2>
                <button className="rounded border px-3 py-1" onClick={logout}>
                  Log out
                </button>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={user.uiHighContrast}
                    onChange={(e) =>
                      updatePreferences({ uiHighContrast: e.target.checked })
                    }
                  />
                  High contrast
                </label>
                <label className="flex items-center gap-2">
                  <span>Text size</span>
                  <select
                    className="rounded border px-2 py-1"
                    value={user.uiTextSize}
                    onChange={(e) =>
                      updatePreferences({
                        uiTextSize: e.target.value as UiTextSize,
                      })
                    }>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="space-y-4 rounded border p-4">
              <h2 className="text-xl font-semibold">Exercises</h2>
              <form className="flex gap-2" onSubmit={addCustomExercise}>
                <input
                  className="flex-1 rounded border px-3 py-2"
                  placeholder="New custom exercise"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                />
                <button
                  className="rounded bg-blue-700 px-3 py-2 text-white"
                  type="submit">
                  Add
                </button>
              </form>
              <ul className="space-y-2">
                {sortedExercises.map((exercise) => (
                  <li
                    className="flex items-center justify-between gap-3 rounded border p-2"
                    key={exercise.exerciseTypeId}>
                    <div>
                      <strong>{exercise.name}</strong>{' '}
                      <span className="opacity-70">
                        ({exercise.isCustom ? 'custom' : 'seed'})
                      </span>
                    </div>
                    {exercise.isCustom ? (
                      <div className="flex items-center gap-2">
                        {editingExerciseId === exercise.exerciseTypeId ? (
                          <>
                            <input
                              className="rounded border px-2 py-1"
                              value={editingExerciseName}
                              onChange={(e) =>
                                setEditingExerciseName(e.target.value)
                              }
                            />
                            <button
                              className="rounded border px-2 py-1"
                              onClick={() =>
                                saveExerciseName(exercise.exerciseTypeId)
                              }>
                              Save
                            </button>
                          </>
                        ) : (
                          <button
                            className="rounded border px-2 py-1"
                            onClick={() => {
                              setEditingExerciseId(exercise.exerciseTypeId);
                              setEditingExerciseName(exercise.name);
                            }}>
                            Edit
                          </button>
                        )}
                        <button
                          className="rounded border px-2 py-1"
                          onClick={() =>
                            deleteExercise(exercise.exerciseTypeId)
                          }>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4 rounded border p-4">
              <h2 className="text-xl font-semibold">Workouts</h2>
              <form className="space-y-2" onSubmit={addWorkout}>
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Workout title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  className="w-full rounded border px-3 py-2"
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <select
                  className="w-full rounded border px-3 py-2"
                  value={exerciseTypeId ?? ''}
                  onChange={(e) =>
                    setExerciseTypeId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }>
                  <option value="">No exercise linked</option>
                  {sortedExercises.map((exercise) => (
                    <option
                      key={exercise.exerciseTypeId}
                      value={exercise.exerciseTypeId}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded bg-blue-700 px-4 py-2 text-white"
                  type="submit">
                  Create workout
                </button>
              </form>

              <ul className="space-y-3">
                {workouts.map((workout) => {
                  const linkedExercise = exercises.find(
                    (item) => item.exerciseTypeId === workout.exerciseTypeId,
                  );
                  const isEditing = editingWorkoutId === workout.workoutId;
                  return (
                    <li className="rounded border p-3" key={workout.workoutId}>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            className="w-full rounded border px-3 py-2"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                          <textarea
                            className="w-full rounded border px-3 py-2"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                          <select
                            className="w-full rounded border px-3 py-2"
                            value={editExerciseTypeId ?? ''}
                            onChange={(e) =>
                              setEditExerciseTypeId(
                                e.target.value ? Number(e.target.value) : null,
                              )
                            }>
                            <option value="">No exercise linked</option>
                            {sortedExercises.map((exercise) => (
                              <option
                                key={exercise.exerciseTypeId}
                                value={exercise.exerciseTypeId}>
                                {exercise.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              className="rounded border px-3 py-1"
                              onClick={() => saveWorkout(workout.workoutId)}>
                              Save
                            </button>
                            <button
                              className="rounded border px-3 py-1"
                              onClick={() => setEditingWorkoutId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold">
                            {workout.title}
                          </h3>
                          {workout.notes ? <p>{workout.notes}</p> : null}
                          <p className="text-sm opacity-75">
                            Started:{' '}
                            {toLocalDateTime(workout.startedAt).replace(
                              'T',
                              ' ',
                            )}
                          </p>
                          <p className="text-sm opacity-75">
                            Exercise: {linkedExercise?.name ?? 'None'}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              className="rounded border px-3 py-1"
                              onClick={() => {
                                setEditingWorkoutId(workout.workoutId);
                                setEditTitle(workout.title);
                                setEditNotes(workout.notes ?? '');
                                setEditExerciseTypeId(workout.exerciseTypeId);
                              }}>
                              Edit
                            </button>
                            <button
                              className="rounded border px-3 py-1"
                              onClick={() =>
                                deleteWorkoutById(workout.workoutId)
                              }>
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
