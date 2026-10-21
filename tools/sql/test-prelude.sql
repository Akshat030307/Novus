-- The little bit of Supabase that docs/supabase.sql leans on, stubbed well
-- enough to test the policies on any plain Postgres.
--
-- auth.uid() normally reads the JWT. Here it reads a session setting, so a
-- test can say "now I am this person" without minting tokens.
--
-- The grants at the bottom matter: Supabase hands `authenticated` table
-- privileges by default, so a policy test on a table with no GRANT would
-- "pass" for the wrong reason — denied by permissions rather than by the rule
-- being tested.

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('novus.test_uid', true), '')::uuid
$$;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated;
