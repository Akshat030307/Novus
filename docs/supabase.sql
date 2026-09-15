-- Novus — cloud schema.
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It is idempotent: re-running it is safe.
--
-- Three tables:
--   saves       the single world save, one row per player   (step 14)
--   attempts    one row per drill or module attempt          (issue B2)
--   transcripts one row per issued report card               (issue B1)
--
-- RLS is on everywhere and a player only ever reaches their own rows. The one
-- exception is verify_transcript() at the bottom, which is how an instructor
-- with a code — and nothing else — reads a single transcript.
--
-- The `saves` block is here so this file is the whole schema rather than a
-- fragment; on a project where saves already exists it is a no-op. If you would
-- rather not touch a working table at all, start from "attempts" below.
--
-- Verified on a throwaway Postgres 16 before it was ever pointed at a live
-- project: applies clean, applies twice clean, and every one of these is
-- rejected — writing a row as another user, a score above its total, an
-- unknown kind, editing an attempt, deleting a transcript, reading either
-- table as anon, and passing '%' to verify_transcript.

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
create or replace function public.verify_transcript(p_code text)
returns table (code text, player_name text, body jsonb, issued_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select t.code, t.player_name, t.body, t.issued_at
  from public.transcripts t
  where t.code = upper(trim(p_code));
$$;

revoke all on function public.verify_transcript(text) from public;
grant execute on function public.verify_transcript(text) to anon, authenticated;

grant select, insert on public.attempts to authenticated;
grant select, insert on public.transcripts to authenticated;
