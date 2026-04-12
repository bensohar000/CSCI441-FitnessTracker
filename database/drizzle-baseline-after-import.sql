-- Baseline Drizzle migration history after `database/schema.sql` + `data.sql`.
-- `schema.sql` builds the same end state as migrations 0002 + 0003, but does not
-- populate `drizzle.__drizzle_migrations`. Without these rows, `pnpm run db:migrate`
-- tries to create tables that already exist and exits with an error.
--
-- When adding a new file under `database/migrations/`, update this script and the
-- journal so hashes stay in sync (run migrate on an empty DB and inspect
-- `SELECT * FROM drizzle.__drizzle_migrations ORDER BY id`).

set client_min_messages to warning;

create schema if not exists drizzle;

create table if not exists drizzle."__drizzle_migrations" (
  id integer primary key not null,
  hash text not null,
  created_at bigint
);

insert into drizzle."__drizzle_migrations" (id, hash, created_at)
values
  (
    1,
    '952747d95a2c275cc7706c6a76d96624afe6855c8939b1db52543a7339ece4b1',
    1775056258855
  ),
  (
    2,
    '80dd27244ba33d5fa3e9fb2f363056d5d381b240de18286a379e645284d9dbaa',
    1743600000000
  )
on conflict (id) do nothing;
