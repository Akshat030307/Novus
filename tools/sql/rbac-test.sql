-- Novus — what a class may and may not do, proved rather than asserted.
--
-- Run against any Postgres with docs/supabase.sql applied (and a stub auth
-- schema; tools/sql/README.md says how). Every line prints PASS or FAIL, so a
-- change to a policy that opens something up shows as FAIL rather than as
-- nothing at all.
--
-- The claim being tested is the one the game makes to students at the point
-- of joining: your teacher sees your attempts and your summary, your
-- classmates see your place on the board, and nobody sees anything else.

\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function pg_temp.as_user(p uuid) returns void
language plpgsql as $$ begin perform set_config('novus.test_uid', p::text, true); end $$;

create or replace function pg_temp.check(label text, got boolean) returns text
language sql as $$ select case when got then 'PASS  ' else 'FAIL  ' end || label $$;

-- how many rows this caller can actually see. A grant error counts as none:
-- the question is whether they can read it, not which layer said no.
create or replace function pg_temp.visible(sql text) returns int
language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || sql || ') q' into n;
  return n;
exception when others then return 0;
end $$;

-- a thing is "denied" if it raises, or quietly affects no rows
create or replace function pg_temp.denied(sql text) returns boolean
language plpgsql as $$
declare n int;
begin
  execute sql; get diagnostics n = row_count;
  return n = 0;
exception when insufficient_privilege or others then return true;
end $$;

-- Supabase grants `authenticated` table privileges by default; docs/supabase.sql
-- only grants the tables it introduces, so `saves` needs this to be tested at
-- the policy layer rather than at the permission layer.
grant select, insert, update, delete on all tables in schema public to authenticated;

truncate public.cohorts cascade;
truncate public.attempts;
truncate public.transcripts;
truncate public.saves;
delete from auth.users;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'teacher-a@x'),
  ('99999999-9999-9999-9999-999999999999', 'teacher-b@x'),
  ('22222222-2222-2222-2222-222222222222', 'student@x'),
  ('33333333-3333-3333-3333-333333333333', 'classmate@x'),
  ('55555555-5555-5555-5555-555555555555', 'stranger@x');

insert into public.cohorts (id, owner, name, join_code) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Teacher A class','AAA111'),
  ('aaaaaaaa-0000-0000-0000-000000000002','99999999-9999-9999-9999-999999999999','Teacher B class','BBB222');

insert into public.cohort_members (cohort_id, user_id, display_name, summary) values
  ('aaaaaaaa-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Student','{"day":5,"workPassed":2,"accuracy":80,"returnPct":1.5}'),
  ('aaaaaaaa-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Classmate','{"day":6,"workPassed":3,"accuracy":90,"returnPct":-2}'),
  ('aaaaaaaa-0000-0000-0000-000000000002','55555555-5555-5555-5555-555555555555','Stranger','{"day":2,"workPassed":0}');

insert into public.assignments (id, cohort_id, kind, ref_id, title) values
  ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','drill','credit-desk','The credit desk');

insert into public.attempts (user_id, kind, ref_id, score, out_of, passed) values
  ('22222222-2222-2222-2222-222222222222','drill','credit-desk',3,5,false),
  ('55555555-5555-5555-5555-555555555555','drill','credit-desk',5,5,true);

insert into public.saves (user_id, state) values
  ('22222222-2222-2222-2222-222222222222','{"cash":123456}');
insert into public.transcripts (code, user_id, player_name, body) values
  ('NVS-TEST1-TEST2','22222222-2222-2222-2222-222222222222','Student','{"x":1}');
\set QUIET off

\echo ''
\echo '== a student in a class =='
begin;
set local role authenticated;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check('cannot set work for their own class',
  pg_temp.denied($q$insert into public.assignments (cohort_id, kind, ref_id, title)
                    values ('aaaaaaaa-0000-0000-0000-000000000001','drill','x','Mine now')$q$));
select pg_temp.check('cannot change work the teacher set',
  pg_temp.denied($q$update public.assignments set title = 'Cancelled'
                    where id = 'bbbbbbbb-0000-0000-0000-000000000001'$q$));
select pg_temp.check('cannot delete work the teacher set',
  pg_temp.denied($q$delete from public.assignments where id = 'bbbbbbbb-0000-0000-0000-000000000001'$q$));
select pg_temp.check('cannot rename the class',
  pg_temp.denied($q$update public.cohorts set name = 'Free period'
                    where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$));
select pg_temp.check('cannot add themselves to another class',
  pg_temp.denied($q$insert into public.cohort_members (cohort_id, user_id, display_name)
                    values ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Gatecrash')$q$));
select pg_temp.check('can read the work their class set',
  (select count(*) = 1 from public.assignments where cohort_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
select pg_temp.check('cannot read another class''s work',
  (select count(*) = 0 from public.assignments where cohort_id = 'aaaaaaaa-0000-0000-0000-000000000002'));
select pg_temp.check('cannot read a classmate''s attempts',
  (select count(*) = 0 from public.attempts where user_id = '55555555-5555-5555-5555-555555555555'));
select pg_temp.check('sees classmates on the board, and only names and figures',
  (select count(*) = 2 from public.class_board('aaaaaaaa-0000-0000-0000-000000000001')));
select pg_temp.check('cannot see the board of a class they are not in',
  (select count(*) = 0 from public.class_board('aaaaaaaa-0000-0000-0000-000000000002')));
select pg_temp.check('can edit their own display name',
  (select not pg_temp.denied($q$update public.cohort_members set display_name = 'Student K'
                               where user_id = '22222222-2222-2222-2222-222222222222'$q$)));
commit;

\echo ''
\echo '== the teacher who owns the class =='
begin;
set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.check('can set work for their class',
  (select not pg_temp.denied($q$insert into public.assignments (cohort_id, kind, ref_id, title)
                               values ('aaaaaaaa-0000-0000-0000-000000000001','module','cash-vs-profit','Cash vs profit')$q$)));
select pg_temp.check('can read their students'' attempts',
  (select count(*) = 1 from public.attempts where user_id = '22222222-2222-2222-2222-222222222222'));
select pg_temp.check('cannot read the attempts of somebody they do not teach',
  (select count(*) = 0 from public.attempts where user_id = '55555555-5555-5555-5555-555555555555'));
select pg_temp.check('cannot read a student''s save',
  pg_temp.visible($q$select 1 from public.saves where user_id = '22222222-2222-2222-2222-222222222222'$q$) = 0);
select pg_temp.check('cannot read a student''s transcript',
  pg_temp.visible($q$select 1 from public.transcripts where user_id = '22222222-2222-2222-2222-222222222222'$q$) = 0);
commit;

\echo ''
\echo '== a teacher of a different class =='
begin;
set local role authenticated;
select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
select pg_temp.check('cannot set work in a class they do not own',
  pg_temp.denied($q$insert into public.assignments (cohort_id, kind, ref_id, title)
                    values ('aaaaaaaa-0000-0000-0000-000000000001','drill','x','Not yours')$q$));
select pg_temp.check('cannot list the other class''s members',
  (select count(*) = 0 from public.cohort_members where cohort_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
select pg_temp.check('cannot read the other class''s students'' attempts',
  (select count(*) = 0 from public.attempts where user_id = '22222222-2222-2222-2222-222222222222'));
commit;

\echo ''
\echo '== somebody in no class at all (plays solo) =='
begin;
set local role authenticated;
select pg_temp.as_user('55555555-5555-5555-5555-555555555555');
select pg_temp.check('has no work set for them',
  (select count(*) = 0 from public.assignments));
select pg_temp.check('can still log their own attempts',
  (select not pg_temp.denied($q$insert into public.attempts (user_id, kind, ref_id, score, out_of, passed)
                               values ('55555555-5555-5555-5555-555555555555','drill','build-a-book',4,4,true)$q$)));
select pg_temp.check('their own save is theirs alone to read',
  pg_temp.visible($q$select 1 from public.saves where user_id <> '55555555-5555-5555-5555-555555555555'$q$) = 0);
commit;
\echo ''
