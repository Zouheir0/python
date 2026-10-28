# Python Path: launch security audit

**Scope:** source-code and configuration review of this repository against the 12 areas in the supplied handwritten audit checklist. **This is not a penetration test.** There is no deployed Supabase project, domain, DNS configuration, or live accounts attached to this source package, so live settings and access controls cannot honestly be marked verified. The checks below separate source-level observations from tests that must be run after deployment.

## Executive summary

**Highest-priority launch risks:** (1) do not publish a Supabase secret/service-role key; (2) run `supabase/schema.sql` and test its row-level security using two different accounts; (3) configure email confirmations and a narrow redirect allowlist; (4) deploy and test the account-deletion function with the correct origin; and (5) finish child-privacy review before collecting email addresses from younger students.

The source includes database-side RLS policies, column-specific grants that prevent ordinary users from editing XP, an owner-only lesson-history policy, an opt-in leaderboard view that returns only usernames and XP, a server-checked one-time XP-award RPC, HTML output escaping, a content security policy meta tag, and a separate Web Worker with a six-second execution timeout. These controls reduce risk, but **they do not prove the deployed app is secure until you test the live project**.

A deliberately important limitation: the expected output and solution code are part of the public course content downloaded by every browser. A user can spoof a known output and attempt to earn casual XP without writing the solution. The database prevents arbitrary direct XP updates and duplicate awards, but the leaderboard is **not cheat-proof**. Do not use XP as grades, proof of authorship, or the basis for prizes.

## 12-area checklist

| Area from the checklist | Source-level status | What remains before launch |
|---|---|---|
| 1. Exposed secrets and keys | `config.js` contains empty placeholders in the repository package. The Edge Function reads the service-role key from server-side environment variables. No key value is required in the browser except a public publishable/anon key. | Search the full Git history and the deployed files for real secrets. Configure only the project URL and publishable key in `config.js`. If a secret was ever committed, rotate it, do not merely delete it. |
| 2. Authentication and sessions | Uses Supabase Auth for sign-up, sign-in, sign-out, session persistence, email confirmation flow, and password recovery. Passwords require at least 10 characters in the interface. | Enable email confirmation, set a strict redirect allowlist, verify reset links, use Supabase Auth rate limits/CAPTCHA as appropriate, and confirm sessions work correctly on the final domain. A browser rule is UX validation, not a security boundary. |
| 3. Authorization and data access | Row-level policies restrict profile read/update to the signed-in owner. Lesson completion records are owner-readable and have no client write grants. No client-supplied `user_id` is accepted by the XP function. | Apply SQL and test with two genuinely different accounts and unauthenticated requests. Confirm user B cannot see or edit A’s records through the API, not just through the UI. |
| 4. Supabase database security | The SQL enables RLS, revokes broad privileges, grants only needed columns, isolates challenge outputs in the unexposed `private` schema, and restricts execution of the XP RPC. XP is updated only inside that RPC. | Run the SQL in the intended Supabase project. Keep `private` out of Data API exposed schemas. Verify no permissive policies or default grants were added elsewhere in the dashboard. Review the `leaderboard` view: it intentionally returns only opted-in `username` and `xp`; anonymous users are not granted direct access to `profiles`. |
| 5. Firebase security | Firebase is not used. | No Firebase rules are needed. Do not add Firebase credentials unless you also add and audit Firebase. |
| 6. API routes and server logic | GitHub Pages is static. A database function checks the logged-in identity, lesson ID, output length, expected output, and duplicate completion before awarding points. The optional Edge Function verifies the bearer token with Supabase Auth before deleting that authenticated user. | Deploy the function, configure `APP_ORIGIN`, and test valid/invalid origins, expired tokens, wrong HTTP methods, and account deletion. Do not add an endpoint that trusts a client-supplied user ID or XP total. Keep server errors generic where they could reveal internal details. |
| 7. Forms and input handling | Usernames are restricted to 3–20 letters, numbers, and underscores at both UI/database layers. User-generated strings are HTML-escaped before entering markup, editor output uses `textContent`, and submitted output is length-limited by the RPC. | Test strings such as `<script>alert(1)</script>` as a username/output; they must never execute as HTML. Test oversized and malformed requests directly against the API because browser validation can be bypassed. |
| 8. Payments and webhooks | No payments, purchases, payment SDKs, or webhooks are present. | If adding payments later, verify webhook signatures server-side, make handlers idempotent, validate price/product IDs on the server, and keep payment secrets out of the static site. |
| 9. AI/API cost abuse | No AI provider or billable text-generation endpoint is included. Python runs locally in the browser. Supabase Auth and the database still consume provider resources. | Monitor Supabase usage and configure appropriate provider rate limits/quotas. Do not add a paid API key to the frontend. If an AI feature is added, proxy it through a server-side endpoint with authenticated quotas, input limits, and abuse monitoring. |
| 10. Admin and internal tools | No admin page or client-side admin role is implemented. The app does not rely on hiding an admin button. | If administration is added, enforce role checks in database/server policy and audit every privileged action. Never treat a hidden frontend route as authorization. |
| 11. Privacy and data handling | Account email is handled by Supabase Auth; the profile stores username, XP, and a public-leaderboard opt-in. The leaderboard exposes username and XP only. Lesson history is owner-only. The editor does not intentionally upload student code or input. | Review provider retention and logs, publish accurate contact/deletion procedures, test account deletion and cascades, and decide how to respond to abuse reports. Obtain jurisdiction-specific child privacy/consent advice before enrolling children under applicable age thresholds. The in-app legal pages are starter copy, not legal advice. |
| 12. Deployment and configuration | A restrictive CSP meta policy, no inline JavaScript, escaped UI output, pinned browser runtime/SDK versions, and a six-second disposable worker are included. The Pages workflow deploys only the six public website files. | Verify HTTPS, the exact redirect list, custom-domain ownership/DNS, and response headers with a live scanner. GitHub Pages cannot set every response header from this repository; a meta CSP is not identical to an HTTP response header and cannot replace controls such as `frame-ancestors`. Inline styles are allowed by the meta policy for the current design, so keep all untrusted strings out of style attributes. |

## Manual launch tests (run all of them)

### Database and authorization

- [ ] Create test accounts A and B with different usernames and email addresses. Complete different activities with A, sign out, then sign in as B. B must see only B’s completion history and profile.
- [ ] While signed in as B, use the Supabase API/SQL test client with B’s token to request A’s profile and completion records. The request must return no protected rows or a permission error.
- [ ] Attempt to update `profiles.xp`, change `profiles.id`, insert a profile row, delete a profile row, or directly insert/update/delete a `lesson_completions` row using an ordinary authenticated client. Every unauthorized operation must fail.
- [ ] Query the leaderboard while signed out. It must return only usernames and XP for accounts that explicitly opted in. It must not return email addresses, user IDs, lesson history, or profiles that opted out.
- [ ] Turn leaderboard sharing off for A. Refresh the page and query the leaderboard again. A must disappear from public results but still be able to see A’s own profile.
- [ ] Call `complete_lesson` while signed out, with a nonexistent activity ID, with wrong output, with output over 10,000 characters, and with a known activity completed twice. Invalid calls must fail and the same activity must never award XP twice.
- [ ] Verify that `private` is not exposed in Supabase Data API settings and that unauthenticated/authenticated roles cannot select from `private.lesson_challenges`.

### Account workflows and Edge Function

- [ ] Create a new account, confirm the email, sign in, close/reopen the browser, refresh the session, sign out, request a password reset, and set a new password. Check browser console and redirect URL behavior.
- [ ] Try a duplicate username with a different email. It should fail cleanly without exposing internal SQL details or creating a broken profile.
- [ ] Deploy `delete-account`; confirm it refuses missing/expired tokens, origins not equal to `APP_ORIGIN`, and methods other than POST/OPTIONS. Confirm a valid signed-in request deletes only that signed-in account and cascades its profile/history.
- [ ] Confirm account deletion works after the email-confirmation workflow, clears local frontend session state, and cannot be triggered using somebody else’s user ID.

### Editor, injection, and runtime

- [ ] Run `print(2 + 5)` and confirm `7`; run `print("2 + 5")` and confirm the literal `2 + 5`. Check capitalisation: `print()` works, `Print()` raises `NameError`.
- [ ] Run `while True: pass`. The worker should time out after roughly six seconds and the UI should remain responsive. Confirm that the worker is terminated after both success and failure.
- [ ] Run `print("<img src=x onerror=alert(1)>")`. The output must display as text and must not create an HTML image or execute script.
- [ ] Test newlines, empty output, input prompts, `ZeroDivisionError`, `NameError`, `TypeError`, and a malformed program. Output must not disappear and the UI must recover after the error.
- [ ] Verify code and input are not included in network requests to Supabase. Do not paste real credentials or personal information into the editor.

### Deployment, keys, privacy and operations

- [ ] Search the repository, Git history, build artifact, browser source, and commit diff for `service_role`, `secret`, database passwords, SMTP credentials, and private provider keys. A variable *name* is not itself a secret; a real key value must not appear in public files or history.
- [ ] Confirm `config.js` contains only the Supabase project URL and public publishable/anon key. Test the application only after applying the SQL. Never disable RLS to fix an error.
- [ ] Inspect the browser Network and Console tabs and a live HTTP security-header scan. Investigate unexpected requests, CSP violations, public redirects, mixed content, or permissive cross-origin settings. Verify the custom domain in GitHub before connecting it, and follow the DNS values shown in GitHub settings.
- [ ] Configure monitoring/alerts for Supabase Auth/database quotas, suspicious signup spikes, and unusual traffic. Do not rely on an undocumented assumption that provider default rate limits are enough.
- [ ] Review the privacy policy and terms with the actual deployed services and retention settings. Before collecting data from children covered by COPPA or other child-privacy laws, get appropriate legal/parental-consent guidance.

## Residual limitations and risk decisions

1. **XP spoofing (medium for casual learning, high if used for prizes/grades):** the browser can send a known expected output directly to the RPC. The database prevents arbitrary XP fields and duplicate awards, but cannot prove that the student typed a particular solution. Do not use the leaderboard for consequential outcomes.
2. **Static hosting header control (medium):** GitHub Pages delivers static files. The meta CSP helps, but cannot set all HTTP response headers. Consider a host/CDN that supports custom security headers if you need stronger framing, HSTS, and cross-origin policies.
3. **Third-party runtime supply chain (medium):** Pyodide and Supabase JS are loaded from jsDelivr at version-pinned URLs. A CDN or upstream compromise is outside the app's control. For higher assurance, self-host reviewed assets, pin integrity hashes where supported by the loading method, and schedule dependency updates.
4. **Child privacy and moderation (high before a public youth launch):** the legal text is not a compliance determination. Do not collect accounts from younger children until consent, privacy notice, retention, deletion, reporting, and applicable legal obligations have been reviewed.
5. **Resource abuse (low-to-medium):** Python runs locally with a six-second hard termination. This limits UI hangs but is not an OS-grade sandbox or a complete denial-of-service defense against all browser or device issues. Do not use it to execute untrusted code on a server.

## Reference guidance

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase JavaScript client installation and Data API permissions](https://supabase.com/docs/reference/javascript/installing)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Pyodide: run Python in a web worker](https://pyodide.org/en/stable/usage/webworker.html)
- [GitHub Pages custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [FTC COPPA guidance](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy)
