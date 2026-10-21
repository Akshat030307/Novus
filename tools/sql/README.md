# Proving the class boundary

`docs/supabase.sql` claims, in words, that a teacher sees their students'
attempts and summaries and nothing else, that classmates see only a name and
five numbers, and that a player in no class is untouched by any of it. These
two files check that the database actually behaves that way.

They need Postgres and nothing else — no Supabase project, no network:

```sh
docker run --rm -d --name novus-sqltest -e POSTGRES_PASSWORD=x postgres:16-alpine
until docker exec novus-sqltest pg_isready -q; do sleep 1; done

for f in tools/sql/test-prelude.sql docs/supabase.sql tools/sql/rbac-test.sql; do
  docker cp "$f" novus-sqltest:/tmp/
done
docker exec novus-sqltest psql -U postgres -q -f /tmp/test-prelude.sql
docker exec novus-sqltest psql -U postgres -q -f /tmp/supabase.sql      # again, to prove it is idempotent
docker exec novus-sqltest psql -U postgres -q -f /tmp/rbac-test.sql

docker rm -f novus-sqltest
```

Every check prints `PASS` or `FAIL`. A policy that quietly opens something up
shows as a `FAIL` line rather than as nothing at all, which is the entire
point — RLS fails open-looking: the query simply returns rows.

`grant`s in the prelude are deliberate. Supabase gives `authenticated` table
privileges by default, so testing a policy on a table nobody granted would
pass for the wrong reason.
