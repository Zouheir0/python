# Python Path

**A beginner-first Python learning platform created by Zouheir Ghosn.** Designed for students who have never coded before, with plain-language lessons, editable code, real Python execution in the browser, mini-projects, XP, levels, accounts, and an opt-in leaderboard.

## What is included

- **16 chapters, 68 coding activities, and 16 mini-projects**, progressing from `print()` and strings to loops, functions, dictionaries, debugging, modules, and classes.
- A live editor in every activity. Students type, run, compare output, see hints, and can reveal or insert one possible solution.
- An open sandbox with real Python through Pyodide. Code runs in a disposable Web Worker and times out after six seconds.
- XP and levels, saved locally when no account backend is configured.
- Optional Supabase accounts, profile settings, cloud progress, password reset, account deletion, and a real opt-in leaderboard.
- Privacy policy, terms, and a 12-area security audit based on the supplied checklist.

## Run locally

Use a local static web server because the app fetches `curriculum.json` as a module resource. For example, with Python installed:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. You do not need to install Python to *use* the website, though a local static server is useful for testing the project files. The browser downloads the real Python runtime from the pinned Pyodide CDN when a learner runs code.

Without Supabase configuration, lessons and XP work locally on that browser. Accounts and the online leaderboard stay disabled, and there are no fake leaderboard entries.

## Deploy on GitHub Pages

1. Create a public repository on GitHub, for example `python-path`, and upload this repository's files to its `main` branch. Keep the directory structure intact.
2. Open **Settings → Pages**. Under **Build and deployment**, choose **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` publishes only the website files. After the workflow succeeds, GitHub shows the site URL, usually `https://YOUR-USERNAME.github.io/python-path/`.
4. You can use that free GitHub Pages address as the initial site. A custom domain requires a domain you control. Add it in **Settings → Pages**, configure the DNS records GitHub specifies, and verify the domain before relying on it. Do not copy random DNS values from a tutorial; use the values shown in your GitHub settings.

GitHub Pages is static hosting. It does not provide a secure private database, password verification server, or private secret store. Supabase below supplies the account database and server-side checks.

## Enable student accounts, cloud progress, and the leaderboard

The backend is optional until you want accounts and cross-device progress. Do not announce the public leaderboard as live until these steps and the security tests pass.

1. Create a Supabase project at <https://supabase.com/dashboard>.
2. Open **SQL Editor** and run the complete `supabase/schema.sql` file from this repository. It creates profiles, private lesson records, hidden database-side challenge output records, row-level security policies, the signup trigger, a constrained leaderboard view, and the XP awarding function. Review the SQL before executing it.
3. In Supabase **Project Settings / API** (the labels may vary), copy the project URL and a **publishable key** (or the legacy `anon` key). Put them in the two empty constants in `config.js`:

   ```js
   export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
   export const SUPABASE_PUBLISHABLE_KEY = 'YOUR_PUBLISHABLE_KEY';
   ```

   A publishable/anon key is intended for browser use only when the database policies are correct. **Never put `service_role`, secret API keys, database passwords, SMTP passwords, or payment-provider secrets in `config.js`, HTML, JavaScript, or any public GitHub repository.** The config file is public by design. The service-role key is used only in Supabase's server-side function environment.

4. In Supabase Auth, enable email confirmation for a public student site. Set the **Site URL** and allowed redirect URLs to the exact deployed site, including the repository path, for example `https://YOUR-USERNAME.github.io/python-path/`. Add any custom domain you actually control. Do not allow broad or unknown redirect URLs. Use the password reset flow on the live domain to confirm it returns to the correct page.
5. In Supabase Data API settings, keep the API exposure list minimal. Do **not** add the `private` schema to exposed schemas. Do not switch off RLS to make an error disappear. The schema grants authenticated users only the profile columns needed, gives users no direct write permission on XP or lesson records, and grants the anonymous role access only to the opt-in leaderboard view.
6. Deploy the optional account deletion function using the Supabase CLI from the repository root after installing and logging in to the CLI:

   ```bash
   supabase functions deploy delete-account
   supabase secrets set APP_ORIGIN=https://YOUR-USERNAME.github.io
   ```

   `APP_ORIGIN` is the **origin only**, without the repository path or trailing slash. For a GitHub Pages project site it is `https://YOUR-USERNAME.github.io`. For a custom domain, use that domain's origin. Supabase normally supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions; confirm those server-side values are present in the deployed function environment. Do not paste the service-role key into the command line, browser, or GitHub. If your Supabase project requires setting it explicitly, set it only through Supabase's function secrets interface.
7. Run every item in `SECURITY_AUDIT.md` with two test accounts before inviting students. Make the public-leaderboard choice **off by default** and verify opting out removes a student from the leaderboard.

### Important limitation about XP

The database prevents a visitor from directly setting arbitrary XP, prevents another student from editing private records, and awards an activity only once per account. However, course content and expected challenge output are downloaded to the browser, so a technically skilled person can spoof a known answer and try to earn XP without doing the work. This is a casual learning leaderboard, **not a cheat-proof competition or gradebook**. Do not attach prizes or school grades to XP. Truly cheat-resistant grading would require a separately designed server-side code execution and hidden-test service with resource limits, monitoring, and abuse controls; a static GitHub Pages app alone cannot provide that.

## How the Python editor works

Pyodide is a WebAssembly build of CPython. This app loads a pinned Pyodide release in a module Web Worker so student code runs separately from the page's UI. The worker is terminated after six seconds. That protects the interface from simple infinite loops, but it is not a security boundary for running confidential or hostile workloads. Student code and input are processed in the browser and are not intentionally sent to Python Path's Supabase database. Never type passwords or personal information into the editor.

The app also loads the Supabase JavaScript SDK from jsDelivr at a pinned version. Both the runtime and SDK require a network connection. For higher supply-chain control, self-host reviewed copies of the runtime and SDK and update them through a reviewed dependency process.

## Child privacy and public launch

This project is educational software for teenagers, but age ranges vary. Before enabling accounts for younger children, collecting their email addresses, or marketing the site to children under 13 in the United States, obtain jurisdiction-specific child-privacy and consent advice. Other jurisdictions may set different requirements. Review the privacy policy, terms, retention, parental-consent requirements, moderation, and abuse-reporting process before launching to real students. The included legal pages are starter text, **not legal advice**.

## Local quality checks

Run `python scripts/check_course.py` to test every one of the 68 authored solution programs against its expected output, verify the database seed contains every activity ID, and confirm the browser config ships blank. The course JavaScript can also be syntax-checked with `node --check app.js` and `node --check curriculum-source.mjs`. These are source checks, not a substitute for live browser and database testing.

## Security documentation

Read [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) before launch. Its checks are a source-level review and test plan, not a penetration-test certificate. A live review of database policies, Auth settings, DNS, and HTTP response headers remains necessary after deployment.

## Attribution and license

Created by **Zouheir Ghosn**. Distributed under the MIT License; see [`LICENSE`](LICENSE).
