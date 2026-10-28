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
                worker_response = page.request.get(url.rsplit("/", 1)[0] + "/python-worker.js?v=20261028-3")
                assert worker_response.status == 200, f"Python worker asset was not served: HTTP {worker_response.status}"
                response = page.goto(url, wait_until="domcontentloaded")
                assert response and response.status == 200, "Website did not return HTTP 200"
                page.locator(".brand-title").wait_for(state="visible")
                assert "Python Path" in page.title()
                page.locator('button[data-action="open-activity"]').first.click()
                page.get_by_role("button", name="Run example").click()
                wait_for_text(page.locator("#example-console"), "I wrote my first line!")
                page.locator('button.nav-button[data-view="sandbox"]').click()
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
                print("PASS: real Python runs in lessons/sandbox; text-vs-math and case sensitivity work; infinite-loop timeout recovers; key views render")
            finally:
                browser.close()
                server.shutdown()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
