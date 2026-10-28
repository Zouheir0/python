#!/usr/bin/env python3
"""Smoke-test the app with a real Chromium browser and real Pyodide CDN runtime."""
from __future__ import annotations
import functools, http.server, os, socketserver, threading, time
from pathlib import Path
from playwright.sync_api import Error as PlaywrightError, sync_playwright
ROOT = Path(__file__).resolve().parents[1]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, _format, *args): pass

def wait_for_text(locator, text, timeout=90):
    deadline = time.monotonic() + timeout
    last = ''
    while time.monotonic() < deadline:
        try:
            last = locator.inner_text(timeout=500)
            if text in last: return last
            if any(marker in last for marker in ('Python runtime could not load from any supported CDN', 'Python module worker failed', 'The Python engine script did not load')):
                raise AssertionError(f'Python runtime failed before producing output: {last}')
        except Exception: pass
        time.sleep(0.25)
    raise AssertionError(f'Timed out waiting for {text!r}; last text was {last!r}')

def wait_for_exact_text(locator, text, timeout=90):
    deadline = time.monotonic() + timeout
    last = ''
    while time.monotonic() < deadline:
        try:
            last = locator.inner_text(timeout=500).strip()
            if last == text: return last
        except Exception: pass
        time.sleep(0.25)
    raise AssertionError(f'Timed out waiting for {text!r}; last text was {last!r}')

def wait_for_console_input(page, output_selector, status_selector, timeout=20):
    deadline = time.monotonic() + timeout
    last_status = ''
    while time.monotonic() < deadline:
        if page.locator(".console-stdin").count() and page.locator(".console-stdin").is_visible():
            return
        try:
            last_status = page.locator(status_selector).inner_text(timeout=250).strip()
            output = page.locator(output_selector).inner_text(timeout=250)
        except Exception:
            output = ''
        if last_status in {"ERROR", "FINISHED"}:
            raise AssertionError(f"Python ended before asking for input: status={last_status!r}; output={output!r}")
        time.sleep(0.1)
    raise AssertionError(f"Timed out waiting for console input: status={last_status!r}; output={page.locator(output_selector).inner_text()!r}")


def main():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        url = f"http://127.0.0.1:{server.server_address[1]}/index.html"
        with sync_playwright() as p:
            launch_args = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
            system_chromium = os.environ.get("CHROMIUM_PATH") or ("/usr/bin/chromium" if Path("/usr/bin/chromium").exists() else None)
            try: browser = p.chromium.launch(**launch_args)
            except PlaywrightError:
                if not system_chromium: raise
                launch_args["executable_path"] = system_chromium
                browser = p.chromium.launch(**launch_args)
            page_errors = []
            try:
                page = browser.new_page()
                page.set_default_timeout(90_000)
                page.on("pageerror", lambda exc: page_errors.append(str(exc)))
                # Do not read or write to the real student backend while running CI.
                page.route("**/config.js", lambda route: route.fulfill(
                    status=200, content_type="text/javascript",
                    body="export const SUPABASE_URL = ''; export const SUPABASE_PUBLISHABLE_KEY = '';"))
                worker_response = page.request.get(url.rsplit("/", 1)[0] + "/python-worker.js?v=20261028-4-interactive-stdin")
                assert worker_response.status == 200, f"Python worker asset was not served: HTTP {worker_response.status}"
                response = page.goto(url, wait_until="domcontentloaded")
                assert response and response.status == 200, "Website did not return HTTP 200"
                page.locator(".brand-title").wait_for(state="visible")
                assert "Python Path" in page.title()
                page.locator('button[data-action="open-activity"]').first.click()
                assert "Read it like a detective" in page.locator(".code-walkthrough").inner_text()
                page.get_by_role("button", name="Run example").click()
                wait_for_text(page.locator("#example-console"), "Hello, world!")
                page.locator('button[data-action="toggle-solution"]').click()
                page.locator('button[data-action="use-solution"]').click()
                page.locator('button[data-action="check-code"]').click()
                wait_for_text(page.locator("#challenge-feedback"), "8 of 15")
                assert page.locator("#top-xp").inner_text().strip() == "8 XP"
                page.locator('button[data-action="reset-code"]').click()
                page.locator("#code-editor").fill('print("I wrote my first line!")')
                page.locator('button[data-action="check-code"]').click()
                wait_for_text(page.locator("#challenge-feedback"), "7 XP bonus")
                assert page.locator("#top-xp").inner_text().strip() == "15 XP"
                page.locator('button[data-action="repeat-activity"]').click()
                assert page.locator("#top-xp").inner_text().strip() == "15 XP", "Repeating a completed activity must preserve earned XP"
                page.locator("#code-editor").fill('print("I wrote my first line!")')
                page.locator('button[data-action="check-code"]').click()
                wait_for_text(page.locator("#challenge-feedback"), "already complete")
                assert page.locator("#top-xp").inner_text().strip() == "15 XP", "Repeating must not award duplicate XP"
                page.locator('button.nav-button[data-view="learn"]').click()
                page.locator('button[data-action="open-chapter"][data-id="c06"]').click()
                page.locator('button[data-action="open-activity"][data-id="c06-p17"]').click()
                page.locator('button[data-action="toggle-solution"]').click()
                page.locator('button[data-action="use-solution"]').click()
                assert page.locator("#input-values").count() == 0, "The lesson must not show a separate input-values box"
                page.locator('button[data-action="check-code"]').click()
                wait_for_console_input(page, "#challenge-console", "#run-status")
                page.locator(".console-stdin").fill("not a number")
                page.locator(".console-stdin").press("Enter")
                wait_for_exact_text(page.locator("#run-status"), "ERROR")
                assert "ValueError" in page.locator("#challenge-console").inner_text(), "Invalid input should behave like Python float(input(...))"
                assert page.locator("#top-xp").inner_text().strip() == "15 XP", "An input error must not award XP"
                page.locator('button[data-action="check-code"]').click()
                wait_for_console_input(page, "#sandbox-output", "#sandbox-status")
                page.locator(".console-stdin").fill("8")
                page.locator(".console-stdin").press("Enter")
                page.locator(".console-stdin").wait_for(state="visible")
                page.locator(".console-stdin").fill("2")
                page.locator(".console-stdin").press("Enter")
                wait_for_text(page.locator("#challenge-feedback"), "20 of 40")
                assert page.locator("#top-xp").inner_text().strip() == "35 XP", "Typing 8 and 2 into the console must pass the calculator and award half credit"
                page.locator('button.nav-button[data-view="sandbox"]').click()
                assert page.locator("#sandbox-input").count() == 0, "The sandbox must not show a separate input-values box"
                page.locator("#sandbox-code").fill('name = input("What is your name? ")\nprint(f"Hello, {name}!")')
                page.locator('button[data-action="sandbox-run"]').click()
                wait_for_text(page.locator("#sandbox-output"), "What is your name?")
                page.locator(".console-stdin").fill("Ada")
                page.locator(".console-stdin").press("Enter")
                wait_for_exact_text(page.locator("#sandbox-status"), "FINISHED")
                assert page.locator("#sandbox-output").inner_text().strip() == "What is your name? Ada\nHello, Ada!", "input() should show the prompt and typed answer in the terminal"
                page.locator("#sandbox-code").fill("def ask():\n    return input('Your name: ')\nanswer = ask()\nprint(answer.upper())")
                page.locator('button[data-action="sandbox-run"]').click()
                page.locator(".console-stdin").wait_for(state="visible")
                page.locator(".console-stdin").fill("Mira")
                page.locator(".console-stdin").press("Enter")
                wait_for_exact_text(page.locator("#sandbox-status"), "FINISHED")
                assert page.locator("#sandbox-output").inner_text().strip() == "Your name: Mira\nMIRA", "input() inside a function should wait for console input"
                page.locator("#sandbox-code").fill("print(2 + 5)")
                page.locator('button[data-action="sandbox-run"]').click()
                wait_for_exact_text(page.locator("#sandbox-status"), "FINISHED")
                assert page.locator("#sandbox-output").inner_text().strip() == "7"
                page.locator("#sandbox-code").fill('print("2 + 5")')
                page.locator('button[data-action="sandbox-run"]').click()
                wait_for_exact_text(page.locator("#sandbox-status"), "FINISHED")
                assert page.locator("#sandbox-output").inner_text().strip() == "2 + 5"
                page.locator("#sandbox-code").fill('Print("hello")')
                page.locator('button[data-action="sandbox-run"]').click()
                wait_for_exact_text(page.locator("#sandbox-status"), "ERROR")
                assert "NameError" in page.locator("#sandbox-output").inner_text()
                page.locator("#sandbox-code").fill("while True: pass")
                page.locator('button[data-action="sandbox-run"]').click()
                wait_for_exact_text(page.locator("#sandbox-status"), "ERROR", timeout=15)
                assert "timed out" in page.locator("#sandbox-output").inner_text().lower()
                page.locator("#sandbox-code").fill('print("runtime still responsive")')
                page.locator('button[data-action="sandbox-run"]').click()
                wait_for_exact_text(page.locator("#sandbox-status"), "FINISHED")
                assert "runtime still responsive" in page.locator("#sandbox-output").inner_text()
                page.locator('button.nav-button[data-view="account"]').click()
                assert "Sign in and sync progress" in page.locator("#app").inner_text()
                page.locator('button.nav-button[data-view="leaderboard"]').click()
                assert "Leaderboard" in page.locator("#app").inner_text()
                assert not page_errors, f"Uncaught browser errors: {page_errors}"
                print("PASS: print() then len(); interactive input() in lesson and sandbox consoles; function-based input; calculator grading; repeat XP; sandbox and key views")
            finally:
                browser.close()
                server.shutdown()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
