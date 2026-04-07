# Project Structure

This map helps new contributors find the right place for each change.

## Root

- `package.json`
  - workspace scripts (`dev`, `lint`, `tsc`, `test`, `build`)
- `pnpm-workspace.yaml`
  - links `client` and `server` packages
- `database/`
  - SQL schema, seed data, and generated migrations
- `docs/`
  - onboarding and architecture docs
- `shared/`
  - client/server shared API envelope types

## Frontend (`client`)

- `src/App.tsx`
  - main mini UI flow: login, accessibility preferences, exercises, workouts
- `src/main.tsx`
  - React mount entrypoint
- `src/test/`
  - MSW handlers and test setup for client behavior
- `src/lib/`
  - API error parsing and utility functions

### Frontend ownership guidance

- New workflow/UI behavior: start in `src/App.tsx`.
- Reusable helpers: add to `src/lib/`.
- API mock updates for tests: `src/test/handlers.ts`.

## Backend (`server`)

- `routes/api.ts`
  - all API route registration and auth middleware placement
- `controllers/`
  - request validation + response mapping:
  - `auth-controller.ts`
  - `exercise-controller.ts`
  - `workout-controller.ts`
- `services/`
  - business logic + DB access:
  - `auth-service.ts`
  - `exercise-service.ts`
  - `workout-service.ts`
- `db/schema.ts`
  - Drizzle table definitions
- `scripts/seed.ts`
  - idempotent seed logic for demo account + exercises

### Backend ownership guidance

- New endpoint: register in `routes/api.ts`, implement controller + service pair.
- Authorization/data ownership logic belongs in services.
- Request parsing and validation stays in controllers.

## Data Layer (`database`)

- `schema.sql`
  - canonical SQL schema for local import
- `data.sql`
  - seed exercise data
- `migrations/`
  - generated migration files (must be committed with schema changes)
- `import.sh`
  - schema/data reset for local bootstrap

## Current Core Domain Objects

- `users`
  - guest/user identity, display name, accessibility preferences
- `exercise_types`
  - seeded global exercises + user custom exercises
- `workouts`
  - user-owned workouts with optional exercise link

## Quick “Where Do I Edit?” Guide

- Login behavior: `server/controllers/auth-controller.ts`, `server/services/auth-service.ts`, `client/src/App.tsx`
- Workout CRUD: `server/controllers/workout-controller.ts`, `server/services/workout-service.ts`, `client/src/App.tsx`
- Exercise CRUD: `server/controllers/exercise-controller.ts`, `server/services/exercise-service.ts`, `client/src/App.tsx`
- Docs updates: files in `docs/` + root `README.md`
