# Troubleshooting

Use this page when setup or runtime behavior is not working as expected.

## Quick Checks First

1. `pnpm install` completed successfully.
2. `server/.env` has `DATABASE_URL`, `TOKEN_SECRET`, `CORS_ORIGIN`.
3. PostgreSQL is running.
4. `pnpm run db:import` and `pnpm run db:seed` were run.
5. `pnpm run dev` is running with both client and server processes.

## Symptom -> What To Check

| Symptom                                       | What to check                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Cannot login as guest                         | Confirm API is running and `POST /api/auth/guest` returns `201`. Check server logs for DB connectivity failures. |
| `401 invalid access token` on protected route | Ensure `Authorization: Bearer <token>` is sent. Re-login to refresh token.                                       |
| `database is not configured` error            | Verify `DATABASE_URL` in `server/.env` and restart server process after env changes.                             |
| Workouts not appearing                        | Confirm you are authenticated and calling `GET /api/workouts` with token.                                        |
| Cannot edit/delete custom exercise            | Ensure exercise is custom and owned by current user (seed exercises are read-only).                              |
| Browser CORS error                            | `CORS_ORIGIN` must exactly match client origin (`http://localhost:5173` in dev).                                 |
| App loads but API requests fail               | Verify Vite proxy and API server port (`8080`) are both running.                                                 |

## Useful Commands

```sh
pnpm run dev:fresh
pnpm run db:import
pnpm run db:seed
pnpm run lint
pnpm run tsc
pnpm run test
pnpm run build
```

## Manual API Sanity Checks

From a separate terminal:

```sh
curl -i http://localhost:8080/api/health
curl -i http://localhost:8080/api/ready
curl -i -X POST http://localhost:8080/api/auth/guest
```

If `/api/ready` returns `503`, fix DB/env before debugging UI issues.

## When to Reset Local DB

If schema/seed data feels out of sync:

```sh
pnpm run db:import
pnpm run db:seed
```

Then restart dev server.
