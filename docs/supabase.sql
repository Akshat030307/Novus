-- Novus — cloud schema.
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It is idempotent: re-running it is safe.
--
--   saves          the single world save, one row per player  (step 14)
--   attempts       one row per drill or module attempt         (issue B2)
--   transcripts    issued report cards and certificates        (issues B1, B8)
--   cohorts        a class, with a join code                   (issue B3)
--   cohort_members who is in it, and their own progress summary
--   assignments    what the instructor set, and when it is due
--
-- RLS is on everywhere and, by default, a player only ever reaches their own
-- rows. There are exactly two ways anything crosses that line, and both are
-- deliberate and narrow:
--
--   verify_transcript(code) — one code reads one transcript, and gives no way
--   to list or enumerate the rest.
--
--   an instructor may read the *practice attempts* and the *published summary*
--   of people who joined their own cohort. Not their save, their cash, their
--   career or their transcripts. The game says so at the point of joining.
--
-- The `saves` block is here so this file is the whole schema rather than a
-- fragment; on a project where saves already exists it is a no-op.
--
-- Verified on a throwaway Postgres 16 before it was ever pointed at a live
-- project: applies clean, applies twice clean, and every one of these is
-- rejected — writing a row as another user, a score above its total, an
-- unknown kind, editing an attempt, deleting a transcript, reading either
-- table as anon, passing '%' to verify_transcript, joining a cohort without a
-- valid code, adding yourself to a cohort directly, a student renaming a
-- cohort or setting their own assignment, and an instructor reaching anything
-- belonging to someone who is not in their cohort.

-- ---------------------------------------------------------------- saves ----
-- (already live; included so this file is the whole schema, not a fragment)

create table if not exists public.saves (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  slot       int         not null default 1,
  state      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.saves enable row level security;

drop policy if exists "saves are private" on public.saves;
create policy "saves are private" on public.saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------- attempts ----
-- Issue B2. A drill or module attempt, kept forever, never edited. The point
-- is the sequence: "credit desk 3/5, then 5/5 two days later" is the evidence
-- of learning, and averaging or overwriting it destroys exactly that.
--
-- Scores are whole numbers over a whole total — 3 of 5, not 0.6 — so nothing
-- rounds and the fraction shown is the fraction stored.

create table if not exists public.attempts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  kind        text        not null check (kind in ('module', 'drill')),
  ref_id      text        not null,
  score       int         not null check (score >= 0),
  out_of      int         not null check (out_of > 0),
  passed      boolean     not null,
  detail      jsonb,
  attempted_at timestamptz not null default now()
);

create index if not exists attempts_by_user on public.attempts (user_id, attempted_at desc);

alter table public.attempts enable row level security;

drop policy if exists "read own attempts" on public.attempts;
create policy "read own attempts" on public.attempts
  for select using (auth.uid() = user_id);

drop policy if exists "log own attempts" on public.attempts;
create policy "log own attempts" on public.attempts
  for insert with check (auth.uid() = user_id and score <= out_of);

-- No update or delete policy, on purpose. An attempt log you can edit is not
-- a record of anything. A bad score stays.

-- ---------------------------------------------------------- transcripts ----
-- Issue B1. An issued report card. `body` is the whole rendered document, not
-- a set of ids: the content files will change, and a transcript must still
-- read years later exactly as it did on the day it was issued.

create table if not exists public.transcripts (
  code        text        primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  player_name text        not null,
  body        jsonb       not null,
  issued_at   timestamptz not null default now()
);

-- Issue B8. A certificate is issued through the same table and the same code as
-- a transcript — a narrower claim, not a different mechanism. The column is an
-- index for listing; `body.docKind` is the document's own answer.
alter table public.transcripts
  add column if not exists kind text not null default 'transcript';

do $$ begin
  alter table public.transcripts
    add constraint transcripts_kind_check check (kind in ('transcript', 'certificate'));
exception when duplicate_object then null;
end $$;

create index if not exists transcripts_by_user on public.transcripts (user_id, issued_at desc);

-- The code. Ambiguous glyphs (0/O, 1/I) are left out because people read these
-- aloud and type them off a screen. 10 characters from 32 is about 50 bits.
create or replace function public.novus_transcript_code() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  raw text;
  candidate text;
begin
  loop
    raw := '';
    for i in 1..10 loop
      raw := raw || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := 'NVS-' || substr(raw, 1, 5) || '-' || substr(raw, 6, 5);
    exit when not exists (select 1 from public.transcripts t where t.code = candidate);
  end loop;
  return candidate;
end;
$$;

alter table public.transcripts alter column code set default public.novus_transcript_code();

-- A column DEFAULT runs as the role doing the INSERT, so `authenticated` must
-- keep EXECUTE or issuing breaks. Revoking from PUBLIC just stops anon calling
-- it as an RPC — it leaks nothing either way, but there is no reason to expose
-- it.
revoke all on function public.novus_transcript_code() from public;
grant execute on function public.novus_transcript_code() to authenticated;

alter table public.transcripts enable row level security;

drop policy if exists "read own transcripts" on public.transcripts;
create policy "read own transcripts" on public.transcripts
  for select using (auth.uid() = user_id);

drop policy if exists "issue own transcripts" on public.transcripts;
create policy "issue own transcripts" on public.transcripts
  for insert with check (auth.uid() = user_id);

-- Again: no update, no delete. Once a transcript is issued it is fixed, and
-- that is the entire reason the code is worth anything.

-- Verification. Anyone holding a code can read that one transcript and no
-- other — the table itself stays unreadable to them, so codes cannot be
-- enumerated or listed. user_id and email are deliberately not returned; a
-- verifier gets the document and the timestamp, not the account behind it.
-- `create or replace` cannot change a function's OUT columns, and this one
-- gained `kind` at issue B8 — so it is dropped first. Anything already granted
-- on it goes with it, which is why the grants below are part of the same block.
drop function if exists public.verify_transcript(text);

create function public.verify_transcript(p_code text)
returns table (code text, player_name text, body jsonb, issued_at timestamptz, kind text)
language sql
stable
security definer
set search_path = public
as $$
  select t.code, t.player_name, t.body, t.issued_at, t.kind
  from public.transcripts t
  where t.code = upper(trim(p_code));
$$;

revoke all on function public.verify_transcript(text) from public;
grant execute on function public.verify_transcript(text) to anon, authenticated;

grant select, insert on public.attempts to authenticated;
grant select, insert on public.transcripts to authenticated;

-- ------------------------------------------------------- b3: teaching ----
-- Issue B3. Cohorts, assignments, and an instructor's view of them.
--
-- The privacy boundary is the thing to get right, and it is narrow on purpose:
-- an instructor can see the practice attempts and the progress summary of
-- people who joined *their* cohort, and nothing else. They cannot read a
-- player's save, their cash, their career, or any transcript. The game says so
-- at the point of joining, in those words.

create table if not exists public.cohorts (
  id         uuid        primary key default gen_random_uuid(),
  owner      uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  join_code  text        not null unique,
  created_at timestamptz not null default now()
);

-- same alphabet as a transcript code, and for the same reason: people read
-- these aloud in a room and type them off a slide
create or replace function public.novus_join_code() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  candidate text;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.cohorts c where c.join_code = candidate);
  end loop;
  return candidate;
end;
$$;

alter table public.cohorts alter column join_code set default public.novus_join_code();

-- as above: the DEFAULT needs `authenticated`, anon does not need it at all
revoke all on function public.novus_join_code() from public;
grant execute on function public.novus_join_code() to authenticated;

create table if not exists public.cohort_members (
  cohort_id    uuid        not null references public.cohorts (id) on delete cascade,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  display_name text        not null,
  /** the member's own compact progress summary — they write it, nobody else */
  summary      jsonb,
  joined_at    timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

create table if not exists public.assignments (
  id         uuid        primary key default gen_random_uuid(),
  cohort_id  uuid        not null references public.cohorts (id) on delete cascade,
  kind       text        not null check (kind in ('drill', 'module')),
  ref_id     text        not null,
  title      text        not null,
  due_at     timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists assignments_by_cohort on public.assignments (cohort_id, created_at);

-- Helpers, security definer so a policy can ask them without the policy's own
-- RLS applying again and recursing.
create or replace function public.owns_cohort(p_cohort uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cohorts c where c.id = p_cohort and c.owner = auth.uid())
$$;

create or replace function public.in_cohort(p_cohort uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cohort_members m
    where m.cohort_id = p_cohort and m.user_id = auth.uid()
  )
$$;

/** does the caller teach this person — i.e. are they in a cohort the caller owns */
create or replace function public.teaches(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cohort_members m
    join public.cohorts c on c.id = m.cohort_id
    where m.user_id = p_user and c.owner = auth.uid()
  )
$$;

alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;
alter table public.assignments enable row level security;

drop policy if exists "own cohorts" on public.cohorts;
create policy "own cohorts" on public.cohorts
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "members see their cohort" on public.cohorts;
create policy "members see their cohort" on public.cohorts
  for select using (public.in_cohort(id));

drop policy if exists "read own membership" on public.cohort_members;
create policy "read own membership" on public.cohort_members
  for select using (auth.uid() = user_id or public.owns_cohort(cohort_id));

drop policy if exists "update own membership" on public.cohort_members;
create policy "update own membership" on public.cohort_members
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "leave own membership" on public.cohort_members;
create policy "leave own membership" on public.cohort_members
  for delete using (auth.uid() = user_id);

-- No INSERT policy: joining goes through join_cohort() below, so a code is the
-- only way in and nobody can add themselves to a cohort they cannot name.

drop policy if exists "cohort reads assignments" on public.assignments;
create policy "cohort reads assignments" on public.assignments
  for select using (public.owns_cohort(cohort_id) or public.in_cohort(cohort_id));

drop policy if exists "owner writes assignments" on public.assignments;
create policy "owner writes assignments" on public.assignments
  for all using (public.owns_cohort(cohort_id)) with check (public.owns_cohort(cohort_id));

-- The one extra thing an instructor may read: the attempts of people in their
-- cohort. Their saves, cash, career and transcripts stay closed.
drop policy if exists "instructor reads cohort attempts" on public.attempts;
create policy "instructor reads cohort attempts" on public.attempts
  for select using (public.teaches(user_id));

-- The OUT columns are prefixed because a RETURNS TABLE column shadows a real
-- one inside the body: naming one of them `cohort_id` makes `on conflict
-- (cohort_id, ...)` ambiguous and every join fails at run time, which no
-- amount of typechecking would have found.
create or replace function public.join_cohort(p_code text, p_name text)
returns table (out_cohort_id uuid, out_cohort_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.cohorts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in before joining a cohort.';
  end if;
  select * into target from public.cohorts c where c.join_code = upper(trim(p_code));
  if not found then
    raise exception 'No cohort has that code.';
  end if;
  insert into public.cohort_members (cohort_id, user_id, display_name)
  values (target.id, auth.uid(), coalesce(nullif(trim(p_name), ''), 'Anonymous'))
  on conflict (cohort_id, user_id) do update set display_name = excluded.display_name;
  return query select target.id, target.name;
end;
$$;

revoke all on function public.join_cohort(text, text) from public;
grant execute on function public.join_cohort(text, text) to authenticated;

grant select, insert, update, delete on public.cohorts to authenticated;
grant select, update, delete on public.cohort_members to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
