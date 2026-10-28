#!/usr/bin/env python3
"""Validate the full curriculum and the database seed before deployment."""
from __future__ import annotations
import builtins, contextlib, io, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
course = json.loads((ROOT / "curriculum.json").read_text(encoding="utf-8"))
activities = [a for chapter in course["chapters"] for a in chapter["activities"]]
ids = [a["id"] for a in activities]
assert len(course["chapters"]) == 16, f"Expected 16 chapters, got {len(course['chapters'])}"
assert len(activities) == 70, f"Expected 70 coding activities, got {len(activities)}"
assert len(ids) == len(set(ids)), "Duplicate activity IDs found"
assert sum(a["kind"] == "project" for a in activities) == 17, "Expected 17 projects across the 16 chapters"
assert all(any(a["kind"] == "project" for a in chapter["activities"]) for chapter in course["chapters"]), "Every chapter needs at least one project"
assert [a["id"] for a in course["chapters"][0]["activities"][:2]] == ["c01-l01", "c01-l04"], "Beginner path must teach print() first, then len()"
assert any(a["id"] == "c06-p17" and a["kind"] == "project" for a in activities), "A standalone calculator capstone is required"
assert all(a.get("starter_code") and a.get("solution_code") for a in activities), "An activity lacks starter/solution code"

assert all(isinstance(a.get('walkthrough'), list) and len(a['walkthrough']) >= 2 for a in activities), 'Every activity needs a code walkthrough of at least two steps'
all_code = '\n'.join(a.get(field, '') for a in activities for field in ('example_code', 'starter_code', 'solution_code'))
early_code = '\n'.join(a.get(field, '') for a in activities if a['chapter_id'] in {'c01', 'c02', 'c03'} for field in ('example_code', 'starter_code', 'solution_code'))
assert 'f"' not in early_code and "f'" not in early_code, 'An f-string appears before Chapter 4 teaches it'
assert '+=' not in all_code and '-=' not in all_code, 'Unexplained augmented assignment remains in the curriculum'

app_js = (ROOT / 'app.js').read_text(encoding='utf-8')
worker_js = (ROOT / 'python-worker.js').read_text(encoding='utf-8')
assert 'const previousUserId = state.user?.id || null;' in app_js, 'Auth changes must detect a different signed-in user'
assert 'if (state.user?.id !== userId) return;' in app_js, 'Stale cloud requests must not overwrite another account'
assert "eq('user_id', userId)" in app_js and "eq('id', userId)" in app_js, 'Cloud progress queries must use a captured user ID'
assert 'state.profile = null;' in app_js and 'state.cloudCompleted = new Set();' in app_js, 'Account switches must clear previous account state'
assert "function clearGuestProgress()" in app_js and "state.local = { completed: [], awards: {} };" in app_js, "Guest-device progress must be cleared when an account is created or switched"
assert "if (nextUserId) clearGuestProgress();" in app_js, "A sign-in identity change must discard unowned guest progress"
assert "function draftStorageKey()" in app_js and "user-${state.user.id}" in app_js and "-guest" in app_js, "Editor drafts must be isolated between account IDs and guest mode"
assert "if (action==='repeat-activity')" in app_js and "Review this lesson again" in app_js, "Completed activities must have an explicit review/repeat action"
assert "Repeating will not remove completion or award XP twice." in app_js, "Repeat behavior must explain that XP is not awarded twice"
assert 'id="input-values"' not in app_js and 'id="sandbox-input"' not in app_js, "input() answers must be entered directly in the console, not in separate boxes"
assert "field.className = 'console-stdin';" in app_js and "message.type === 'input-request'" in app_js, "The console must show an inline input prompt and wait for Enter"
assert "inputRow.className = 'console-input-row';" in app_js, "The console input box must be laid out on its own row, not over prompt text"
assert 'prompt = "" if prompt_arg is None else str(prompt_arg)' in worker_js, "A None prompt must not be rendered as stray None text"
assert "type: 'stdin'" in app_js and "await _pp_request_input(prompt)" in worker_js, "The Python worker must pause for console input instead of preloading answers"
assert "ast.PyCF_ALLOW_TOP_LEVEL_AWAIT" in worker_js, "Interactive input must work in ordinary top-level Python code"
assert '_pp_input_async\": _pp_input_async' in worker_js and "eval(_pp_code_object, _pp_student_globals)" in worker_js, "Transformed input() calls must resolve in the student code execution scope"
assert "needsCompleteLessonSchemaUpdate(error)" in app_js and "PGRST202" in app_js, "Missing RPC errors must show a specific Supabase schema-migration instruction"
assert "blob/main/supabase/schema.sql" in app_js, "Cloud progress errors must link to the current schema SQL"

failed = []
for activity in activities:
    output = io.StringIO()
    queued_inputs = (activity.get("input_values") or "").split("\n")
    def fake_input(prompt: object = "") -> str:
        if prompt: print(prompt, end="")
        if not queued_inputs: raise EOFError("No input line was provided by the test harness")
        value = queued_inputs.pop(0); print(value); return value
    original_input = builtins.input; error = None; builtins.input = fake_input
    try:
        with contextlib.redirect_stdout(output):
            exec(compile(activity["solution_code"], f"<{activity['id']}>", "exec"), {"__name__": "__main__"})
    except BaseException as exc:
        error = f"{type(exc).__name__}: {exc}"
    finally:
        builtins.input = original_input
    actual = output.getvalue().replace("\r\n", "\n").rstrip("\n")
    expected = str(activity.get("expected_output", "")).replace("\r\n", "\n").rstrip("\n")
    if error or actual != expected: failed.append((activity["id"], activity["title"], error, actual, expected))

sql = (ROOT / "supabase" / "schema.sql").read_text(encoding="utf-8")
seeded = re.findall(r"\(E'(c\d{2}-(?:l|p)\d{2})',", sql)
assert len(seeded) == 70, f"Expected 70 challenge seed rows, got {len(seeded)}"
assert set(seeded) == set(ids), f"Challenge seed mismatch: missing {set(ids)-set(seeded)}; extra {set(seeded)-set(ids)}"
assert "notify pgrst, 'reload schema';" in sql.lower(), "Schema SQL must refresh PostgREST cache"

config = (ROOT / "config.js").read_text(encoding="utf-8")
assert re.search(r"https://[a-z0-9-]+\.supabase\.co", config), "Config should use a Supabase project URL"
assert ("sb_publishable_" in config or ("SUPABASE_PUBLISHABLE_KEY" in config and "anon" in config.lower())), "Config needs a browser publishable/anon key"
assert "SUPABASE_SERVICE_ROLE_KEY =" not in config, "Never put service-role credentials in browser config"
if failed:
    for item in failed: print("FAIL", item[0], item[1], "error=", item[2], "actual=", repr(item[3]), "expected=", repr(item[4]))
    raise SystemExit(f"{len(failed)} solution(s) failed")
print(f"PASS: {len(course['chapters'])} chapters, {len(activities)} activities, 17 projects")
print(f"PASS: all {len(activities)} solution programs produce the expected output")
print("PASS: 70 challenge seed IDs match the course and the schema reloads PostgREST")
print("PASS: browser config uses only a publishable/anon key")
print("PASS: print() is followed by len(), then the course builds toward an independent calculator project")
print("PASS: input() prompts are handled inline by the interactive console")
