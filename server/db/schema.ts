import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  userId: serial('userId').primaryKey(),
  authSubject: text('authSubject').notNull().unique(),
  email: text('email').unique(),
  passwordHash: text('passwordHash'),
  isGuest: boolean('isGuest').notNull().default(false),
  displayName: text('displayName').notNull(),
  uiHighContrast: boolean('uiHighContrast').notNull().default(false),
  uiTextSize: text('uiTextSize').notNull().default('normal'),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const exerciseTypes = pgTable(
  'exercise_types',
  {
    exerciseTypeId: serial('exerciseTypeId').primaryKey(),
    userId: integer('userId').references(() => users.userId, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    muscleGroup: text('muscleGroup'),
    category: text('category').notNull().default('resistance'),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('exercise_types_user_name_unique').on(t.userId, t.name)],
);

export const workouts = pgTable('workouts', {
  workoutId: serial('workoutId').primaryKey(),
  userId: integer('userId')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  notes: text('notes'),
  exerciseTypeId: integer('exerciseTypeId').references(
    () => exerciseTypes.exerciseTypeId,
    { onDelete: 'set null' },
  ),
  startedAt: timestamp('startedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp('endedAt', { withTimezone: true }),
  durationMinutes: real('durationMinutes'),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
