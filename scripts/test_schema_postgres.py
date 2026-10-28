#!/usr/bin/env python3
"""Apply the Supabase schema to a disposable Postgres service and test access controls."""
from __future__ import annotations
import os, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DB = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/python_path_test")

def psql(sql=None, file=None, expect_success=True):
    args = ["psql", DB, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"]
    if file is not None: args += ["-f", str(file)]
    else: args += ["-c", sql]
    result = subprocess.run(args, text=True, capture_output=True)
    if expect_success and result.returncode:
        raise RuntimeError(f"psql failed:\n{result.stderr}\n{result.stdout}")
    if not expect_success and result.returncode == 0:
        raise AssertionError(f"SQL unexpectedly succeeded: {sql}")
    return result.stdout.strip(), result.stderr.strip()

bootstrap = """
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
"""
psql(bootstrap)
schema = ROOT / "supabase" / "schema.sql"
psql(file=schema)
psql(file=schema)  # Re-running must be safe and re-seed the same challenge catalogue.
count, _ = psql("SELECT count(*) FROM private.lesson_challenges;")
assert count == "68", f"Expected 68 private challenges, got {count}"
privileges, _ = psql("""SELECT
  (NOT has_table_privilege('anon','public.profiles','SELECT')) AND
  (NOT has_column_privilege('authenticated','public.profiles','xp','UPDATE')) AND
  has_table_privilege('anon','public.leaderboard','SELECT') AND
  (NOT has_function_privilege('anon','public.complete_lesson(text,text)','EXECUTE')) AND
  has_function_privilege('authenticated','public.complete_lesson(text,text)','EXECUTE');""")
assert privileges == "t", f"Unexpected role permissions: {privileges}"
a = "11111111-1111-4111-8111-111111111111"
b = "22222222-2222-4222-8222-222222222222"
psql(f"""INSERT INTO auth.users(id,raw_user_meta_data) VALUES
('{a}', '{{"username":"public_student","leaderboard_public":true}}'::jsonb),
('{b}', '{{"username":"private_student","leaderboard_public":false}}'::jsonb);""")
profile, _ = psql(f'''SET ROLE authenticated;
SET request.jwt.claim.sub = '{a}';
SELECT public.save_profile('renamed_student', true)::text;
RESET ROLE;''')
profile_json = __import__('json').loads(profile)
assert profile_json['id'] == a and profile_json['username'] == 'renamed_student' and profile_json['xp'] == 0 and profile_json['leaderboard_public'] is True, f'Profile save failed: {profile_json}'
rpc, _ = psql(f"""SET ROLE authenticated;
SET request.jwt.claim.sub = '{a}';
SELECT public.complete_lesson('c01-l01','I wrote my first line!')->>'awarded';
SELECT public.complete_lesson('c01-l01','I wrote my first line!')->>'awarded';
SELECT xp FROM public.profiles WHERE id = '{a}';
RESET ROLE;""")
assert rpc.splitlines() == ["true", "false", "15"], f"RPC double-award test failed: {rpc}"
own_data, _ = psql(f"""SET ROLE authenticated;
SET request.jwt.claim.sub = '{a}';
SELECT count(*) FROM public.profiles;
SELECT count(*) FROM public.lesson_completions WHERE user_id = '{b}';
RESET ROLE;""")
assert own_data.splitlines() == ["1", "0"], f"RLS cross-account test failed: {own_data}"
leaderboard, _ = psql("SET ROLE anon; SELECT username FROM public.leaderboard ORDER BY username; RESET ROLE;")
assert leaderboard.splitlines() == ["renamed_student"], f"Opt-in leaderboard filter failed: {leaderboard}"
_, denied = psql(f"SET ROLE authenticated; SET request.jwt.claim.sub = '{a}'; UPDATE public.profiles SET xp = 999 WHERE id = '{a}';", expect_success=False)
assert "permission denied" in denied.lower(), f"Direct XP update wasn't denied: {denied}"
_, wrong_output = psql(f"SET ROLE authenticated; SET request.jwt.claim.sub = '{a}'; SELECT public.complete_lesson('c01-l02','not the expected answer');", expect_success=False)
assert "output does not match" in wrong_output.lower(), f"Wrong output wasn't rejected: {wrong_output}"
print("PASS: schema applies and re-runs cleanly; 68 seeds present")
print("PASS: RLS isolates accounts; public leaderboard reveals only opted-in usernames")
print("PASS: profile-save RPC safely updates the signed-in student's profile without accepting XP")
print("PASS: browser roles cannot update XP or call XP RPC anonymously")
print("PASS: correct challenge awards XP once; incorrect output is rejected")
