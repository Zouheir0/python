-- Python Path database schema.
-- Run this entire file in the Supabase SQL Editor. Re-running it updates challenge outputs.
-- Creates the account profile trigger, private challenge outputs, RLS policies and leaderboard.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  xp integer not null default 0 check (xp >= 0),
  leaderboard_public boolean not null default false
);
create unique index if not exists profiles_username_lower_unique on public.profiles (lower(username));

create table if not exists public.lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^c[0-9]{2}-(l[0-9]{2}|p[0-9]{2})$'),
  xp_awarded integer not null check (xp_awarded between 1 and 100),
  solution_used boolean not null default false,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.lesson_completions add column if not exists solution_used boolean not null default false;
create index if not exists lesson_completions_user_idx on public.lesson_completions (user_id);

create table if not exists private.lesson_challenges (
  lesson_id text primary key check (lesson_id ~ '^c[0-9]{2}-(l[0-9]{2}|p[0-9]{2})$'),
  expected_output text not null,
  xp_award integer not null check (xp_award between 1 and 100)
);
revoke all on private.lesson_challenges from public, anon, authenticated;
alter table private.lesson_challenges enable row level security;

insert into private.lesson_challenges (lesson_id, expected_output, xp_award)
values
  (E'c01-l01', E'I wrote my first line!', 15),
  (E'c01-l02', E'7', 15),
  (E'c01-l03', E'Python notices capitals.', 15),
  (E'c01-p01', E'Name: Noor\nFavorite subject: Art\n14', 40),
  (E'c02-l01', E'5', 15),
  (E'c02-l02', E'3', 15),
  (E'c02-l03', E'16', 15),
  (E'c02-p02', E'15', 40),
  (E'c03-l01', E'18', 15),
  (E'c03-l02', E'72', 15),
  (E'c03-l03', E'24', 15),
  (E'c03-l04', E'3', 15),
  (E'c03-p03', E'12', 40),
  (E'c04-l01', E'I like Python!', 15),
  (E'c04-l02', E'code time', 15),
  (E'c04-l03', E'LEARN', 15),
  (E'c04-l04', E'Ava is 14', 15),
  (E'c04-p04', E'Welcome, Rami! Level 2', 40),
  (E'c05-l01', E'<class ''float''>', 15),
  (E'c05-l02', E'10', 15),
  (E'c05-l03', E'Level 3', 15),
  (E'c05-p05', E'Next year: 16', 40),
  (E'c06-l01', E'Name? Noor\nHello, Noor!', 15),
  (E'c06-l02', E'Number? 6\n12', 15),
  (E'c06-l03', E'Amount? 3.5\n4.5', 15),
  (E'c06-p06', E'Snack? cookies\nHow many? 2\nOrder: 2 cookies', 40),
  (E'c07-l01', E'True', 15),
  (E'c07-l02', E'True', 15),
  (E'c07-l03', E'True', 15),
  (E'c07-p07', E'True', 40),
  (E'c08-l01', E'Ready', 15),
  (E'c08-l02', E'Odd', 15),
  (E'c08-l03', E'Silver', 15),
  (E'c08-p08', E'Careful', 40),
  (E'c09-l01', E'[3, 5, 8]', 15),
  (E'c09-l02', E'owl', 15),
  (E'c09-l03', E'[''eat'', ''play'', ''sleep'']', 15),
  (E'c09-l04', E'12\n[2, 4, 6]', 15),
  (E'c09-p09', E'[''Sky'', ''Ocean'', ''Stars'']\n3', 40),
  (E'c10-l01', E'2\n4\n6', 15),
  (E'c10-l02', E'1\n2\n3\n4', 15),
  (E'c10-l03', E'6', 15),
  (E'c10-p10', E'5\n10\n15\n20', 40),
  (E'c11-l01', E'1\n2', 15),
  (E'c11-l02', E'0\n1\n2', 15),
  (E'c11-l03', E'1\n2\n4', 15),
  (E'c11-p11', E'4\n3\n2\n1\nLaunch!', 40),
  (E'c12-l01', E'You can do it!', 15),
  (E'c12-l02', E'Hello!\nHello!', 15),
  (E'c12-l03', E'Start\nPlay fair', 15),
  (E'c12-p12', E'Level up!\nLevel up!', 40),
  (E'c13-l01', E'Hello, Noor!', 15),
  (E'c13-l02', E'12', 15),
  (E'c13-l03', E'12', 15),
  (E'c13-p13', E'9', 40),
  (E'c14-l01', E'blue', 15),
  (E'c14-l02', E'25', 15),
  (E'c14-l03', E'unknown', 15),
  (E'c14-p14', E'Kai level 4', 40),
  (E'c15-l01', E'5.0', 15),
  (E'c15-l02', E'9', 15),
  (E'c15-l03', E'Next year: 15', 15),
  (E'c15-l04', E'Please use digits', 15),
  (E'c15-p15', E'Invalid number', 40),
  (E'c16-l01', E'12.0', 15),
  (E'c16-l02', E'2', 15),
  (E'c16-l03', E'Robot', 15),
  (E'c16-p16', E'Luna: 2', 40)
on conflict (lesson_id) do update
set expected_output = excluded.expected_output, xp_award = excluded.xp_award;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_public_text text;
  v_public boolean := false;
begin
  v_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  if v_username !~ '^[a-zA-Z0-9_]{3,20}$' then
    v_username := 'student_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  v_public_text := lower(coalesce(new.raw_user_meta_data ->> 'leaderboard_public', 'false'));
  if v_public_text in ('true', 'false') then v_public := (v_public_text = 'true'); end if;
  insert into public.profiles (id, username, xp, leaderboard_public)
  values (new.id, v_username, 0, v_public)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_python_path on auth.users;
create trigger on_auth_user_created_python_path after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select (id, username, xp, leaderboard_public) on public.profiles to authenticated;
grant update (username, leaderboard_public) on public.profiles to authenticated;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
using (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter table public.lesson_completions enable row level security;
revoke all on public.lesson_completions from public, anon, authenticated;
grant select (user_id, lesson_id, xp_awarded, solution_used, completed_at) on public.lesson_completions to authenticated;
drop policy if exists lesson_completions_select_own on public.lesson_completions;
create policy lesson_completions_select_own on public.lesson_completions for select to authenticated
using (user_id = (select auth.uid()));

create or replace view public.leaderboard with (security_barrier = true) as
select username, xp from public.profiles where leaderboard_public is true;
revoke all on public.leaderboard from public;
grant select on public.leaderboard to anon, authenticated;

-- Save only the authenticated user's profile and repair missing rows. XP is not client-editable.
-- Save only the authenticated user's profile and repair missing rows. XP is not client-editable.
create or replace function public.save_profile(p_username text, p_leaderboard_public boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $save_profile$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in is required.' using errcode = '28000';
  end if;
  if p_username is null or p_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Username must be 3 to 20 letters, numbers, or underscores.' using errcode = '22023';
  end if;
  insert into public.profiles (id, username, xp, leaderboard_public)
  values (v_user_id, p_username, 0, coalesce(p_leaderboard_public, false))
  on conflict (id) do update
  set username = excluded.username, leaderboard_public = excluded.leaderboard_public
  returning * into v_profile;
  return jsonb_build_object('id', v_profile.id, 'username', v_profile.username, 'xp', v_profile.xp, 'leaderboard_public', v_profile.leaderboard_public);
end;
$save_profile$;
revoke all on function public.save_profile(text, boolean) from public, anon;
grant execute on function public.save_profile(text, boolean) to authenticated;

drop function if exists public.complete_lesson(text, text);
create or replace function public.complete_lesson(p_lesson_id text, p_output text, p_used_solution boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_expected text;
  v_points integer;
  v_output text;
  v_inserted integer;
  v_total integer;
  v_award integer;
  v_existing_points integer;
  v_existing_solution_used boolean;
  v_bonus integer;
begin
  if v_user_id is null then raise exception 'Sign in is required.' using errcode = '28000'; end if;
  if p_lesson_id is null or length(p_lesson_id) > 40 then raise exception 'Invalid activity ID.' using errcode = '22023'; end if;
  if p_output is null or length(p_output) > 10000 then raise exception 'Output is missing or too long.' using errcode = '22023'; end if;
  select expected_output, xp_award into v_expected, v_points from private.lesson_challenges where lesson_id = p_lesson_id;
  if not found then raise exception 'Unknown activity.' using errcode = '22023'; end if;
  v_output := regexp_replace(replace(p_output, E'\r\n', E'\n'), E'\n+$', '');
  if v_output is distinct from v_expected then raise exception 'Output does not match the expected result.' using errcode = '22000'; end if;
  v_award := case when coalesce(p_used_solution, false) then greatest(1, ceil(v_points / 2.0)::integer) else v_points end;
  insert into public.lesson_completions (user_id, lesson_id, xp_awarded, solution_used)
  values (v_user_id, p_lesson_id, v_award, coalesce(p_used_solution, false)) on conflict (user_id, lesson_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    update public.profiles set xp = xp + v_award where id = v_user_id returning xp into v_total;
    if not found then raise exception 'Student profile is missing.' using errcode = 'P0002'; end if;
    return jsonb_build_object('awarded', true, 'upgraded', false, 'solution_used', coalesce(p_used_solution, false), 'xp_awarded', v_award, 'full_activity_xp', v_points, 'total_xp', v_total);
  end if;
  select xp_awarded, solution_used into v_existing_points, v_existing_solution_used from public.lesson_completions where user_id = v_user_id and lesson_id = p_lesson_id for update;
  if not coalesce(p_used_solution, false) and v_existing_solution_used and v_existing_points < v_points then
    v_bonus := v_points - v_existing_points;
    update public.lesson_completions set xp_awarded = v_points, solution_used = false where user_id = v_user_id and lesson_id = p_lesson_id;
    update public.profiles set xp = xp + v_bonus where id = v_user_id returning xp into v_total;
    if not found then raise exception 'Student profile is missing.' using errcode = 'P0002'; end if;
    return jsonb_build_object('awarded', true, 'upgraded', true, 'solution_used', false, 'xp_awarded', v_bonus, 'full_activity_xp', v_points, 'total_xp', v_total);
  end if;
  select xp into v_total from public.profiles where id = v_user_id;
  return jsonb_build_object('awarded', false, 'upgraded', false, 'solution_used', coalesce(v_existing_solution_used, false), 'xp_awarded', 0, 'full_activity_xp', v_points, 'activity_xp_awarded', coalesce(v_existing_points, v_points), 'total_xp', coalesce(v_total, 0));
end;
$$;
revoke all on function public.complete_lesson(text, text, boolean) from public, anon;
grant execute on function public.complete_lesson(text, text, boolean) to authenticated;
comment on function public.complete_lesson(text, text, boolean) is 'Validates challenge output, awards half XP for assisted solutions, permits a later independent completion to earn the rest, and awards no duplicate full credit.'

notify pgrst, 'reload schema';
