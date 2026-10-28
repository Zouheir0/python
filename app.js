import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const LOCAL_KEY = 'python-path-local-v2';
const DRAFT_KEY = 'python-path-drafts-v3';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const cleanOutput = (value) => String(value ?? '').replace(/\r\n?/g, '\n').replace(/\n+$/g, '');
const validUsername = (name) => /^[a-zA-Z0-9_]{3,20}$/.test(name);

const state = {
  chapters: [], activities: [], view: 'learn', chapterId: null, activityId: null,
  user: null, session: null, profile: null, supabase: null, backendError: '',
  local: loadLocal(), cloudCompleted: new Set(), accountTab: 'signin', recoveryMode: false,
  running: false, lastRun: null, hintOpen: false, solutionOpen: false, solutionUsed: false,
  search: '', referenceSearch: '', leaderboardRows: [], leaderboardError: '',
  notice: '', noticeKind: 'info',
};

function loadLocal() {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{"completed":[]}');
    return { completed: Array.isArray(value.completed) ? value.completed.filter((id) => typeof id === 'string') : [], awards: value.awards && typeof value.awards === 'object' && !Array.isArray(value.awards) ? value.awards : {} };
  } catch { return { completed: [] }; }
}
function saveLocal() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state.local)); } catch {} }
function clearGuestProgress() {
  // Guest progress has no account owner; never let it appear as a newly signed-in user's progress.
  state.local = { completed: [], awards: {} };
  saveLocal();
  try { localStorage.removeItem(`${DRAFT_KEY}-guest`); } catch {}
}
function draftStorageKey() { return state.user?.id ? `${DRAFT_KEY}-user-${state.user.id}` : `${DRAFT_KEY}-guest`; }
function loadDrafts() { try { return JSON.parse(localStorage.getItem(draftStorageKey()) || '{}'); } catch { return {}; } }
function saveDraft(id, code, inputs, usedSolution = state.solutionUsed) {
  const drafts = loadDrafts(); drafts[id] = { code, inputs, usedSolution: id === 'sandbox' ? false : Boolean(usedSolution) }; try { localStorage.setItem(draftStorageKey(), JSON.stringify(drafts)); } catch {}
}
function getDraft(id) { return loadDrafts()[id] || null; }
function allActivities() { return state.chapters.flatMap((chapter) => chapter.activities); }
function currentActivity() { return state.activities.find((item) => item.id === state.activityId) || null; }
function doneSet() { return state.user ? state.cloudCompleted : new Set(state.local.completed); }
function isDone(id) { return doneSet().has(id); }
function totalCount() { return state.activities.length; }
function completeCount() { return state.activities.filter((a) => isDone(a.id)).length; }
function pointsFor(ids, awards = null) { const set = ids instanceof Set ? ids : new Set(ids); return state.activities.reduce((sum, a) => sum + (set.has(a.id) ? Number(awards?.[a.id] ?? a.points) : 0), 0); }
function localXP() { return pointsFor(state.local.completed, state.local.awards); }
function rewardFor(activity, usedSolution) { return usedSolution ? Math.max(1, Math.ceil(activity.points / 2)) : activity.points; }
function currentXP() { return state.user ? Number(state.profile?.xp || 0) : localXP(); }
function currentLevel() { return Math.floor(currentXP() / 100) + 1; }
function levelProgress() { return currentXP() % 100; }
function nextActivity(activity) { const index = state.activities.findIndex((a) => a.id === activity.id); return state.activities[index + 1] || null; }
function prevActivity(activity) { const index = state.activities.findIndex((a) => a.id === activity.id); return state.activities[index - 1] || null; }
function chapterActivityCount(chapter) { return chapter.activities.filter((a) => isDone(a.id)).length; }
function configured() { return /^https:\/\//.test(SUPABASE_URL) && SUPABASE_PUBLISHABLE_KEY.length > 20 && !SUPABASE_URL.includes('YOUR_PROJECT'); }
function showNotice(message, kind='info') { state.notice = message; state.noticeKind = kind; }
function clearNotice() { state.notice = ''; state.noticeKind = 'info'; }

async function init() {
  try {
    const response = await fetch('./curriculum.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load course content (${response.status}).`);
    const data = await response.json();
    state.chapters = data.chapters || [];
    state.activities = allActivities();
    if (!state.activities.length) throw new Error('The course content is empty.');
  } catch (error) {
    $('#app').innerHTML = `<main class="main"><h1>Python Path could not start</h1><p>${esc(error.message)}</p><p>Open this website through GitHub Pages or a local web server, not as a standalone file URL, so the course data can load.</p></main>`;
    return;
  }
  await initBackend();
  render();
  if (state.user) await refreshCloudProgress(false);
  await maybeLoadLeaderboard(false);
}

async function initBackend() {
  if (!configured()) return;
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');
    state.supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
      global: { headers: { 'X-Client-Info': 'python-path-web' } },
    });
    const { data, error } = await state.supabase.auth.getSession();
    if (error) throw error;
    state.session = data.session;
    state.user = data.session?.user || null;
    if (state.user) await refreshProfile();
    state.supabase.auth.onAuthStateChange((event, session) => {
      const previousUserId = state.user?.id || null;
      const nextUserId = session?.user?.id || null;
      state.session = session;
      state.user = session?.user || null;
      state.recoveryMode = event === 'PASSWORD_RECOVERY';

      // Never let one account's in-memory profile/history flash for the next account.
      if (previousUserId !== nextUserId) {
        state.profile = null;
        state.cloudCompleted = new Set();
        state.backendError = '';
        state.lastRun = null;
        if (nextUserId) clearGuestProgress();
        updateHeaderStats();
        if (state.view === 'account') render();
      }
      if (!state.user) { state.profile = null; state.cloudCompleted = new Set(); }

      // Defer async calls so the auth event handler does not block Supabase's auth lock.
      // Capture the user ID: a slow response from the previous account must be ignored.
      queueMicrotask(async () => {
        const activeUserId = state.user?.id || null;
        if (activeUserId) await refreshCloudProgress(false, activeUserId);
        if (state.user?.id === activeUserId && (state.view === 'account' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY')) render();
        if (state.user?.id === activeUserId) updateHeaderStats();
      });
    });
  } catch (error) {
    state.supabase = null;
    state.backendError = error.message || 'The online account service could not be loaded.';
  }
}

async function refreshProfile() {
  if (!state.supabase || !state.user) return;
  const userId = state.user.id;
  const { data, error } = await state.supabase.from('profiles').select('id,username,xp,leaderboard_public').eq('id', userId).maybeSingle();
  if (error) throw error;
  // A sign-in can change while this request is in flight. Ignore stale account responses.
  if (state.user?.id !== userId) return;
  if (data && data.id !== userId) return;
  state.profile = data;
}
async function refreshCloudProgress(shouldRender = true, expectedUserId = null) {
  const userId = expectedUserId || state.user?.id || null;
  if (!state.supabase || !userId || state.user?.id !== userId) return;
  try {
    const [{ data: completed, error: completedError }, { data: profile, error: profileError }] = await Promise.all([
      state.supabase.from('lesson_completions').select('lesson_id').eq('user_id', userId),
      state.supabase.from('profiles').select('id,username,xp,leaderboard_public').eq('id', userId).maybeSingle(),
    ]);
    if (completedError) throw completedError;
    if (profileError) throw profileError;
    // Do not allow late responses from a previously signed-in account to overwrite the current one.
    if (state.user?.id !== userId) return;
    if (profile && profile.id !== userId) throw new Error('Account profile did not match the signed-in user.');
    state.cloudCompleted = new Set((completed || []).map((row) => row.lesson_id));
    state.profile = profile;
    state.backendError = '';
    if (shouldRender) render(); else updateHeaderStats();
  } catch (error) {
    if (state.user?.id !== userId) return;
    state.backendError = error.message || 'Could not load account progress.';
    // When the active account has no readable profile, show no previous account's values.
    if (!state.profile || state.profile.id !== userId) {
      state.profile = null;
      state.cloudCompleted = new Set();
      updateHeaderStats();
    }
  }
}

function navButton(view, label, icon) {
  return `<button class="nav-button ${state.view === view || (view === 'learn' && ['chapter','activity'].includes(state.view)) ? 'active' : ''}" data-action="navigate" data-view="${view}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`;
}
function renderShell(content) {
  const xp = currentXP();
  const name = state.profile?.username || state.user?.email?.split('@')[0] || 'Learner';
  return `<div class="app-shell">
    <header class="topbar">
      <a href="#" class="brand" data-action="navigate" data-view="learn" aria-label="Python Path home"><span class="brand-mark">Py</span><span><span class="brand-title">PYTHON PATH</span><span class="brand-sub" style="display:block">Learn by writing code</span></span></a>
      <div class="top-right"><span class="top-stat">LEVEL <strong id="top-level">${currentLevel()}</strong></span><span class="top-stat"><strong id="top-xp">${xp} XP</strong></span><button class="button quiet" data-action="navigate" data-view="account">${state.user ? esc(name) : 'Sign in'}</button></div>
    </header>
    <aside class="sidebar"><div><div class="nav-label">Learning</div><nav class="nav-list" aria-label="Main navigation">${navButton('learn','Course path','01')}${navButton('sandbox','Code sandbox','⌘')}${navButton('reference','Python reference','Aa')}</nav></div><div><div class="nav-label">Community</div><nav class="nav-list" aria-label="Community navigation">${navButton('leaderboard','Leaderboard','#')}${navButton('account','Account','@')}</nav></div><div class="sidebar-bottom">${navButton('privacy','Privacy policy','i')}${navButton('terms','Terms & conditions','§')}<div class="sidebar-note">Created by <strong>Zouheir Ghosn</strong>.<br>Progress saves in this browser or your account.</div></div></aside>
    <main class="main" id="main-content">${content}${renderFooter()}</main>
  </div>`;
}
function renderFooter() {
  return `<footer class="footer"><span>Python Path · Created by Zouheir Ghosn</span><div class="footer-links"><button data-action="navigate" data-view="privacy">Privacy policy</button><button data-action="navigate" data-view="terms">Terms &amp; conditions</button></div></footer>`;
}
function render() {
  let content = '';
  switch (state.view) {
    case 'learn': content = renderLearn(); break;
    case 'chapter': content = renderChapter(); break;
    case 'activity': content = renderActivity(); break;
    case 'sandbox': content = renderSandbox(); break;
    case 'leaderboard': content = renderLeaderboard(); break;
    case 'account': content = renderAccount(); break;
    case 'reference': content = renderReference(); break;
    case 'privacy': content = renderPrivacy(); break;
    case 'terms': content = renderTerms(); break;
    default: content = renderLearn();
  }
  $('#app').innerHTML = renderShell(content);
  bindCurrentView();
}
function renderLearn() {
  const completed = completeCount();
  const pct = Math.round(completed / Math.max(1,totalCount()) * 100);
  const next = state.activities.find((activity) => !isDone(activity.id)) || state.activities[0];
  const filtered = state.chapters.filter((chapter) => `${chapter.title} ${chapter.desc} ${chapter.activities.map(a=>a.title).join(' ')}`.toLowerCase().includes(state.search.toLowerCase()));
  return `<div class="eyebrow">Your learning path</div><h1 class="page-title">Learn Python by writing Python.</h1><p class="lead">Short explanations, runnable examples, and projects you actually code yourself. Start from zero, then build up to functions, data, debugging, and objects.</p>
    <div class="hero-grid"><section class="hero"><span class="tag green">START HERE</span><h2>${completed === 0 ? 'One small idea. One line of code.' : completed === totalCount() ? 'You finished every activity.' : 'Ready for the next small win?'}</h2><p>${completed === 0 ? 'You do not need to know anything about programming. Read the idea, run a small example, then type your own code and run it.' : completed === totalCount() ? 'You can keep experimenting in the sandbox, or revisit a project and make it your own.' : `Continue with “${esc(next.title)}”. Every chapter includes a project to combine what you just learned.`}</p><div class="button-row"><button class="button primary" data-action="open-activity" data-id="${next.id}">${completed === totalCount() ? 'Practice in sandbox' : 'Continue learning'} →</button><button class="button quiet" data-action="navigate" data-view="sandbox">Open code sandbox</button></div></section>
    <section class="panel progress-panel"><div class="eyebrow">Your progress</div><div class="progress-number">${completed}<span class="muted" style="font-size:15px;font-weight:600"> / ${totalCount()}</span></div><div class="small">coding activities completed</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="progress-labels"><span>${pct}% finished</span><span>${totalCount()-completed} left</span></div><div class="stats-row"><div class="stat-box"><strong>${currentXP()}</strong><span>XP earned</span></div><div class="stat-box"><strong>${currentLevel()}</strong><span>current level</span></div><div class="stat-box"><strong>${state.chapters.length}</strong><span>chapters</span></div></div><p class="small" style="margin-top:12px">${state.user ? 'Cloud progress is connected to your account.' : 'Your progress is saved on this device. Sign in to sync it across devices.'}</p></section></div>
    <div class="section-heading"><div><h2>Course chapters</h2><p class="small" style="margin:4px 0 0">Lessons move from beginner basics to more advanced projects.</p></div><span class="tag">${totalCount()} activities</span></div>
    <div class="search-row"><input class="search-input" id="course-search" type="search" placeholder="Find a chapter or skill..." value="${esc(state.search)}" aria-label="Search chapters"></div>
    <div class="chapter-grid">${filtered.map((chapter, index) => {
      const done = chapterActivityCount(chapter); const total=chapter.activities.length; const percentage=Math.round(done/total*100);
      return `<button class="chapter-card" data-action="open-chapter" data-id="${chapter.id}"><div class="card-top"><span class="chapter-no">CHAPTER ${String(state.chapters.indexOf(chapter)+1).padStart(2,'0')}</span><span class="tag ${done===total?'green':''}">${done===total?'Complete':`${done}/${total}`}</span></div><h3>${esc(chapter.title)}</h3><p>${esc(chapter.desc)}</p><div class="mini-track"><span style="width:${percentage}%"></span></div><div class="card-bottom"><span>${total-1} lessons + project${total-1===1?'':'s'}</span><span>${percentage}%</span></div></button>`;
    }).join('') || '<div class="empty">No chapter matches that search.</div>'}</div>`;
}
function renderChapter() {
  const chapter = state.chapters.find((c) => c.id === state.chapterId) || state.chapters[0];
  const done = chapterActivityCount(chapter);
  return `<div class="eyebrow">Chapter ${String(state.chapters.indexOf(chapter)+1).padStart(2,'0')}</div><h1 class="page-title">${esc(chapter.title)}</h1><p class="lead">${esc(chapter.desc)}</p><div class="chapter-actions"><button class="button quiet" data-action="navigate" data-view="learn">← All chapters</button><button class="button primary" data-action="open-activity" data-id="${(chapter.activities.find(a=>!isDone(a.id))||chapter.activities[0]).id}">Start next activity →</button></div><section class="panel" style="padding:14px 16px;margin-bottom:14px"><div class="progress-labels"><span>${done} of ${chapter.activities.length} complete</span><span>${chapter.activities.reduce((n,a)=>n+a.points,0)} possible XP</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.round(done/chapter.activities.length*100)}%"></div></div><p class="small">Each activity has an editable code editor. After a few lessons, you will make a small project that combines the ideas.</p></section><div class="activity-list">${chapter.activities.map((a,i)=>`<button class="activity-row" data-action="open-activity" data-id="${a.id}"><span class="activity-index ${isDone(a.id)?'done':''}">${isDone(a.id)?'✓':String(i+1).padStart(2,'0')}</span><span class="activity-copy"><span class="activity-title">${esc(a.title)}</span><span class="activity-sub">${isDone(a.id) ? 'Completed · open to review and practise again.' : (a.kind==='project'?'Put your skills together in a project.':'Learn one new idea and practise it in code.')}</span></span><span class="activity-right"><span class="tag ${a.kind==='project'?'gold':''}">${a.kind==='project'?'PROJECT':'LESSON'}</span>${isDone(a.id)?'<span class="tag green">REVIEW</span>':''}<span>up to ${a.points} XP</span><span>→</span></span></button>`).join('')}</div>`;
}
function renderActivity() {
  const activity = currentActivity();
  if (!activity) { state.view='learn'; return renderLearn(); }
  const chapter = state.chapters.find((c) => c.id === activity.chapter_id);
  const idx = chapter.activities.findIndex((a)=>a.id===activity.id);
  const prev = prevActivity(activity); const next=nextActivity(activity);
  const draft = getDraft(activity.id);
  const starter = draft?.code ?? activity.starter_code;
  const inputValues = draft?.inputs ?? activity.input_values ?? '';
  state.solutionUsed = Boolean(draft?.usedSolution);
  return `<div class="eyebrow">${esc(chapter.title)} / ${activity.kind==='project'?'Project':'Lesson'} ${idx+1}</div><section class="activity-layout"><article class="panel lesson-text"><div class="lesson-heading"><div><span class="tag ${activity.kind==='project'?'gold':'green'}">${activity.kind==='project'?'MINI PROJECT':'ONE SMALL IDEA'}</span><h1>${esc(activity.title)}</h1><p class="small">${esc(chapter.title)} · up to ${activity.points} XP</p></div><span class="tag ${isDone(activity.id)?'green':''}">${isDone(activity.id)?'Complete':'In progress'}</span></div><p class="lesson-concept">${esc(activity.concept)}</p><div class="analogy"><strong>Picture it:</strong> ${esc(activity.analogy)}</div>
  <section class="code-walkthrough"><div class="eyebrow">Decode the code</div><h2>Read it like a detective</h2><ol>${(activity.walkthrough || []).map((step) => `<li>${esc(step)}</li>`).join("")}</ol><p class="small">Try explaining these steps in your own words before moving on.</p></section>
  <details class="prediction-box"><summary>Predict first — then reveal the example output</summary><p class="small">Look at the code and guess what Python will display. Then compare your prediction.</p><pre class="demo-code">${esc(activity.example_output || "(No output)")}</pre></details>
  <div class="section-heading" style="margin-top:21px"><div><h2>See an example</h2><p class="small" style="margin:3px 0 0">Run this small example and compare it with the result.</p></div></div><pre class="demo-code">${esc(activity.example_code)}</pre><div class="button-row"><button class="button" data-action="run-example" ${state.running?'disabled':''}>Run example</button><span class="small">Runs in your browser, not on a server.</span></div><div class="demo-output placeholder" id="example-console" aria-live="polite">Press Run example to see the result.</div>
  <div class="section-heading" style="margin-top:22px"><div><h2>Your turn</h2><p class="small" style="margin:3px 0 0">The goal is to change or write code, not select an answer.</p></div></div><div class="task-box"><div class="task-label">${activity.kind === "project" ? "YOUR MISSION" : "QUICK CHALLENGE"}</div><p>${esc(activity.task)}</p></div><p class="small">Run your code. If the output matches the goal, you earn XP and unlock the next step. If it does not, you can try again.</p>
  <div class="lesson-meta"><div class="button-row"><button class="button quiet" data-action="repeat-activity">${isDone(activity.id)?'↻ Review this lesson again':'↻ Restart this lesson'}</button><button class="button quiet" data-action="open-chapter" data-id="${chapter.id}">Back to chapter</button></div><div class="button-row">${prev?`<button class="button quiet" data-action="open-activity" data-id="${prev.id}">← Previous</button>`:''}${next?`<button class="button primary" data-action="open-activity" data-id="${next.id}">Next →</button>`:''}</div></div>
  </article><aside class="panel editor-card"><div class="editor-head"><div><h2>Code editor</h2><div class="editor-help">Type, edit, or delete anything. Use Tab for 4 spaces. Ctrl/⌘ + Enter runs your code.</div></div><span class="tag">Python</span></div><label class="input-label" for="code-editor">Your code</label><textarea class="code-editor" id="code-editor" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Write your Python code">${esc(starter)}</textarea>
  <details class="input-details" ${activity.input_values ? 'open' : ''}><summary class="input-label">Input values for input() <span class="small">(one answer per line)</span></summary><textarea class="input-editor" id="input-values" spellcheck="false" aria-label="Values provided to input function">${esc(inputValues)}</textarea></details>
  <div class="button-row" style="margin-top:12px"><button class="button primary" data-action="check-code" ${state.running?'disabled':''}>▶ Run &amp; check</button><button class="button" data-action="run-custom" ${state.running?'disabled':''}>Run only</button><button class="button quiet" data-action="reset-code">Reset code</button></div>
  <div class="console-card"><div class="console-head"><span class="console-title">Python console</span><span class="tag" id="run-status">READY</span></div><div class="console-output" id="challenge-console" aria-live="polite">Your output will appear here.</div></div>
  <div id="challenge-feedback"></div>
  <div class="button-row" style="margin-top:10px"><button class="button quiet" data-action="toggle-hint">${state.hintOpen?'Hide hint':'Need a hint?'}</button><button class="button quiet" data-action="toggle-solution">${state.solutionOpen?'Hide solution':'Show solution'}</button></div><p class="small reward-note">Hints never lower your XP. Putting the full solution in the editor earns half credit; it also restores the lesson's sample inputs. Reset and solve it yourself later to earn the rest.</p>
  <div id="hint-holder">${state.hintOpen?`<div class="hint-panel"><strong>Hint:</strong> ${esc(activity.hint)}</div>`:''}</div>${state.solutionOpen?`<div class="hint-panel"><strong>One working solution:</strong><pre class="demo-code">${esc(activity.solution_code)}</pre><button class="button" data-action="use-solution">Put solution in editor</button></div>`:''}
  ${isDone(activity.id)?`<div class="feedback good">You have completed this activity. Use “Review this lesson again” to restart with the starter code. Repeating will not remove completion or award XP twice. If you first used the full solution, solve it independently to earn the remaining XP.</div>`:''}</aside></section>`;
}
function renderSandbox() {
  const draft = getDraft('sandbox') || {code:`name = input("What is your name? ")\nprint(f"Hello, {name}!")`,inputs:'Python Path'};
  return `<div class="eyebrow">Practice workspace</div><h1 class="page-title">Code sandbox</h1><p class="lead">Write any Python you want to try. This uses a real Python runtime in your browser. Your code and input are not sent to Python Path servers.</p><section class="activity-layout" style="margin-top:20px"><article class="panel lesson-text"><div class="section-heading" style="margin-top:0"><div><h2>Try a starter program</h2><p class="small" style="margin:4px 0 0">Load a sample if you want an idea, then edit it freely.</p></div></div><div class="button-row"><button class="button" data-action="sandbox-template" data-template="hello">Hello world</button><button class="button" data-action="sandbox-template" data-template="strings">Text vs math</button><button class="button" data-action="sandbox-template" data-template="loops">For loop</button><button class="button" data-action="sandbox-template" data-template="calculator">Calculator</button></div><div class="notice" style="margin-top:16px"><strong>Safe practice tip:</strong> The code runs in a separate browser worker. A long-running program is stopped after a time limit. Do not paste passwords or private information into code.</div><div class="section-heading"><div><h2>What is supported?</h2></div></div><p class="small">Pyodide runs real Python in the browser, including core Python syntax, loops, functions, lists, dictionaries, classes, errors, and standard-library modules. Network access and third-party package installation are not part of this learning workspace.</p></article><aside class="panel editor-card"><div class="editor-head"><div><h2>Sandbox editor</h2><div class="editor-help">Ctrl/⌘ + Enter runs the program.</div></div><span class="tag">Python</span></div><label class="input-label" for="sandbox-code">Your code</label><textarea id="sandbox-code" class="code-editor" spellcheck="false" autocapitalize="off" aria-label="Sandbox Python editor">${esc(draft.code)}</textarea><label class="input-label" for="sandbox-input">Input values for input() <span class="small">(one answer per line)</span></label><textarea id="sandbox-input" class="input-editor" spellcheck="false">${esc(draft.inputs)}</textarea><div class="button-row" style="margin-top:12px"><button class="button primary" data-action="sandbox-run">▶ Run code</button><button class="button quiet" data-action="sandbox-clear">Clear output</button></div><div class="console-card"><div class="console-head"><span class="console-title">Live console</span><span class="tag" id="sandbox-status">READY</span></div><div class="console-output" id="sandbox-output" aria-live="polite">Ready to run your script.</div></div></aside></section>`;
}
function renderLeaderboard() {
  if (!configured()) return `<div class="eyebrow">Community</div><h1 class="page-title">Leaderboard</h1><p class="lead">Compare XP with learners who chose to appear publicly. Real scores will show here after the Supabase setup is completed.</p><div class="notice warn" style="margin-top:18px"><strong>Leaderboard is not connected yet.</strong><p>Configure the Supabase project URL and publishable key in config.js, then run supabase/schema.sql in the Supabase SQL Editor. No fake ranks or placeholder scores are shown.</p></div><div class="button-row" style="margin-top:15px"><button class="button primary" data-action="navigate" data-view="account">Set up student account</button></div>`;
  if (state.leaderboardError) return `<div class="eyebrow">Community</div><h1 class="page-title">Leaderboard</h1><div class="notice warn">Could not load the leaderboard: ${esc(state.leaderboardError)}. Check that schema.sql has been applied and the leaderboard view is readable.</div><button class="button" data-action="reload-leaderboard" style="margin-top:12px">Try again</button>`;
  const rows=state.leaderboardRows;
  return `<div class="eyebrow">Community</div><h1 class="page-title">Leaderboard</h1><p class="lead">Students appear here only if they chose to share their username and XP. Email addresses and private lesson history are never shown.</p><div class="button-row" style="margin:18px 0 12px"><button class="button" data-action="reload-leaderboard">Refresh rankings</button><button class="button quiet" data-action="navigate" data-view="account">Privacy and leaderboard settings</button></div><section class="panel" style="overflow:auto"><table class="leaderboard-table"><thead><tr><th>Rank</th><th>Username</th><th>Level</th><th>XP</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${state.profile?.username===r.username?'me':''}"><td>${i+1}</td><td>${esc(r.username)}${state.profile?.username===r.username?' (you)':''}</td><td>${Math.floor(Number(r.xp)/100)+1}</td><td>${Number(r.xp)}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No public scores yet. Finish a coding challenge and opt in from your account settings.</td></tr>'}</tbody></table></section><p class="small" style="margin-top:9px">Rankings are based on completed coding challenges. One activity awards XP only once per account.</p>`;
}
function renderAccount() {
  if (!configured()) return `<div class="eyebrow">Student account</div><h1 class="page-title">Sign in and sync progress</h1><p class="lead">Online accounts and a shared leaderboard need a Supabase project. Until you connect it, your progress is saved locally on this device.</p>${state.backendError?`<div class="notice warn" style="margin-top:15px">${esc(state.backendError)}</div>`:''}<div class="panel" style="padding:18px;margin-top:18px"><h2 style="font-size:16px;margin-top:0">Connect your Supabase project</h2><p class="small">1. Create a project. 2. Run supabase/schema.sql from this repository in the Supabase SQL Editor. 3. Put the project URL and publishable key in config.js. The publishable key can be public when the database policies are correct. Never put a service-role key in browser code.</p><pre class="demo-code">export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';\nexport const SUPABASE_PUBLISHABLE_KEY = 'YOUR_PUBLISHABLE_KEY';</pre><div class="button-row"><a class="button quiet" href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">Open Supabase dashboard</a></div></div><div class="panel" style="padding:18px;margin-top:12px"><h2 style="font-size:15px;margin-top:0">Your current local account</h2><p class="small">No password or email is stored by this app while offline. You have ${state.local.completed.length} locally completed activities and ${localXP()} XP on this browser.</p></div>`;
  if (state.user) return renderSignedInAccount();
  if (state.recoveryMode) return `<div class="eyebrow">Account recovery</div><h1 class="page-title">Choose a new password</h1><section class="panel" style="padding:18px;max-width:580px;margin-top:18px"><form id="password-recovery-form" class="form-grid"><div class="form-field full"><label for="recovery-password">New password (at least 10 characters)</label><input id="recovery-password" name="password" type="password" minlength="10" required autocomplete="new-password"></div><div class="form-field full"><button class="button primary" type="submit">Update password</button></div></form><div id="account-message"></div></section>`;
  const signup=state.accountTab==='signup';
  return `<div class="eyebrow">Student account</div><h1 class="page-title">${signup?'Create your account':'Welcome back'}</h1><p class="lead">Save progress across devices. You choose whether to share your username and XP on the public leaderboard.</p><div class="tabs"><button class="tab ${!signup?'active':''}" data-action="account-tab" data-tab="signin">Sign in</button><button class="tab ${signup?'active':''}" data-action="account-tab" data-tab="signup">Create account</button></div><section class="panel" style="padding:18px;max-width:620px"><form id="auth-form" class="form-grid">${signup?`<div class="form-field full"><label for="signup-username">Username (3 to 20 letters, numbers, or underscores)</label><input id="signup-username" name="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" required autocomplete="username" placeholder="codelearner15"></div>`:''}<div class="form-field full"><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" required autocomplete="email" maxlength="254"></div><div class="form-field full"><label for="auth-password">Password (at least 10 characters)</label><input id="auth-password" name="password" type="password" required minlength="10" autocomplete="${signup?'new-password':'current-password'}"></div>${signup?`<div class="form-field full"><label class="check-row"><input id="leaderboard-opt-in" type="checkbox"><span>I choose to show my username and XP on the public leaderboard. My email and lesson history will not be public.</span></label></div>`:''}<div class="form-field full"><button class="button primary" type="submit">${signup?'Create account':'Sign in'}</button></div></form><div class="button-row" style="margin-top:10px">${!signup?'<button class="button quiet" data-action="password-reset">Email me a password reset link</button>':''}</div><div id="account-message" style="margin-top:13px"></div></section><p class="small" style="max-width:620px;margin-top:12px">Use a username rather than your real name. Do not share a password with classmates. If you opt into the leaderboard, your username and XP are publicly visible. On a shared device, guest-only progress and drafts are cleared when you sign in or create an account so they cannot be attributed to another learner; existing cloud account progress remains intact.</p>`;
}
function renderSignedInAccount() {
  const p=state.profile || {};
  return `<div class="eyebrow">Student account</div><h1 class="page-title">Your account</h1><p class="lead">Your completed lessons and earned XP are saved to this account.</p><div class="hero-grid"><section class="panel" style="padding:18px"><div class="eyebrow">Signed in</div><h2 style="font-size:22px;margin:6px 0">${esc(p.username||'Student')}</h2><p class="small">Email: ${esc(state.user.email||'Not shown publicly')}</p><div class="stats-row"><div class="stat-box"><strong>${Number(p.xp||0)}</strong><span>total XP</span></div><div class="stat-box"><strong>${Math.floor(Number(p.xp||0)/100)+1}</strong><span>level</span></div><div class="stat-box"><strong>${state.cloudCompleted.size}</strong><span>activities complete</span></div></div><div class="button-row" style="margin-top:16px"><button class="button" data-action="sign-out">Sign out</button><button class="button quiet" data-action="navigate" data-view="learn">Back to learning</button></div></section><section class="panel level-card"><div class="level-line"><div><div class="eyebrow">Current level</div><div class="level-number">Level ${Math.floor(Number(p.xp||0)/100)+1}</div></div><span class="tag green">${Number(p.xp||0)} XP</span></div><div class="level-progress"><span style="width:${Number(p.xp||0)%100}%"></span></div><p class="small">${100-(Number(p.xp||0)%100)} XP to the next level.</p></section></div><section class="panel" style="padding:18px;margin-top:14px;max-width:780px"><h2 style="font-size:16px;margin-top:0">Profile and privacy</h2><form id="profile-form" class="form-grid"><div class="form-field full"><label for="profile-username">Public username</label><input id="profile-username" name="username" value="${esc(p.username||'')}" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" required autocomplete="username"></div><div class="form-field full"><label class="check-row"><input id="profile-leaderboard" type="checkbox" ${p.leaderboard_public?'checked':''}><span>Show my username and XP on the public leaderboard. Turn this off to remove my profile from rankings.</span></label></div><div class="form-field full"><button class="button primary" type="submit">Save profile settings</button></div></form><div id="account-message" style="margin-top:12px"></div></section><section class="panel" style="padding:18px;margin-top:14px;max-width:780px"><h2 style="font-size:15px;margin-top:0">Delete account</h2><p class="small">This permanently deletes your account, profile, XP, and cloud lesson history. This action cannot be undone.</p><button class="button danger" data-action="delete-account">Delete my account</button><div id="delete-message" style="margin-top:12px"></div></section>`;
}
function renderReference() {
  const refs=[
    ['print()','Show values on the console. Quotes make text; no quotes means Python evaluates an expression.','print("2 + 5")  # shows 2 + 5\nprint(2 + 5)      # shows 7'],
    ['input()','Ask for text typed by the person running the program. The result is a string.','name = input("Name? ")'],
    ['int() / float() / str()','Convert between types. Invalid numeric text can raise ValueError.','int("14") + 1\nfloat("2.5") * 2\nstr(14)'],
    ['type()','Ask Python for the type of a value.','type(12)\ntype("12")'],
    ['len() / sum() / sorted()','Count items, add numbers, or make a sorted copy of a collection.','len([2, 4, 6])\nsum([2, 4, 6])\nsorted([3, 1, 2])'],
    ['range() / enumerate()','Make number sequences for loops, or get both an index and item.','for n in range(1, 4):\n    print(n)\n\nfor i, item in enumerate(["a", "b"], start=1):\n    print(i, item)'],
    ['if / elif / else','Choose which indented block runs. Remember the colon and indentation.','if score >= 90:\n    print("A")\nelif score >= 60:\n    print("Pass")\nelse:\n    print("Retry")'],
    ['for / while','Repeat a block. Ensure a while condition can eventually become false.','for item in ["a", "b"]:\n    print(item)\n\ncount = 0\nwhile count < 2:\n    count += 1'],
    ['def / return','Define reusable instructions. return sends a value back; print displays it.','def double(number):\n    return number * 2\n\nprint(double(4))'],
    ['list.append() / list.pop()','Change a list by adding an item or removing and returning one.','items = ["pen"]\nitems.append("book")\nlast = items.pop()'],
    ['dict.get() / dict.items()','Look up a key with a default or loop through all key-value pairs.','profile.get("age", 0)\nfor key, value in profile.items():\n    print(key, value)'],
    ['String methods','Change letter case, remove edge whitespace, or test the contents of text.','"Hello".upper()\n" Hello ".strip()\n"py" in "python"'],
    ['try / except','Handle errors you know how to recover from, rather than hiding every problem.','try:\n    number = int("hello")\nexcept ValueError:\n    print("Please use digits")'],
    ['import math / random','Use standard-library tools without reimplementing them.','import math\nmath.sqrt(81)\n\nimport random\nrandom.randint(1, 6)'],
    ['Classes and objects','A class defines attributes and methods for objects created from it.','class Pet:\n    def __init__(self, name):\n        self.name = name\n\npet = Pet("Milo")\nprint(pet.name)'],
  ];
  const filtered=refs.filter(r=>(r[0]+' '+r[1]+' '+r[2]).toLowerCase().includes(state.referenceSearch.toLowerCase()));
  return `<div class="eyebrow">Quick lookup</div><h1 class="page-title">Python reference</h1><p class="lead">A small reference for the syntax taught in the lessons. Try the examples in the Code Sandbox.</p><div class="search-row"><input class="search-input" id="reference-search" type="search" placeholder="Search a function or idea..." value="${esc(state.referenceSearch)}" aria-label="Search Python reference"></div><div class="reference-grid">${filtered.map(([name,desc,code])=>`<article class="panel reference-card"><h3>${esc(name)}</h3><p>${esc(desc)}</p><pre class="demo-code">${esc(code)}</pre><button class="button quiet" data-action="copy-reference" data-code="${esc(code)}">Copy example</button></article>`).join('')||'<div class="empty">No reference entries match that search.</div>'}</div>`;
}
function renderPrivacy() {
  return `<div class="eyebrow">Information / Legal</div><h1 class="page-title">Privacy policy</h1><p class="lead">Plain-language details about what Python Path stores and what other services may receive.</p><div class="legal"><section class="panel"><h2>1. Information collected</h2><p>When online accounts are enabled, Supabase Auth processes the email address and password needed to create and secure an account. Python Path stores a username, XP total, optional public-leaderboard preference, and completed activity IDs. It does not ask for a real name, school, birth date, phone number, or location.</p></section><section class="panel"><h2>2. What is public</h2><p>Only a username and XP appear on the leaderboard, and only for accounts that opt in. Email addresses, account IDs, passwords, and individual lesson histories are not part of the public leaderboard. You can opt out in Account settings.</p></section><section class="panel"><h2>3. Code and input</h2><p>Python code and the input values entered into the editor run in the browser using Pyodide. The app does not intentionally upload student code or sandbox input to Python Path servers. The Python runtime is downloaded from jsDelivr. Do not enter passwords, personal information, or secrets into the editor. Browser extensions and device-level software may behave independently of this site.</p></section><section class="panel"><h2>4. Hosting and infrastructure</h2><p>If hosted by GitHub Pages, GitHub logs visitors’ IP addresses for security purposes. Supabase handles authentication and the account records after the backend is configured. Each provider has its own privacy terms and retention rules.</p></section><section class="panel"><h2>5. Children and students</h2><p>This site is designed for learning. It should not collect more personal information than needed. Before inviting children under 13 in the United States, or launching to children in other jurisdictions, the operator should obtain legal guidance on applicable child-privacy and consent requirements. This policy is not legal advice.</p></section><section class="panel"><h2>6. Your choices and deletion</h2><p>You can opt out of the leaderboard. The account page has a delete-account action when the optional Supabase Edge Function is deployed. Local progress can be removed by clearing this site’s local storage. Contact the site owner if cloud account deletion does not work.</p></section><section class="panel"><h2>7. Changes and contact</h2><p>The operator should update this policy before enabling new data collection, analytics, payments, or third-party services. Created by Zouheir Ghosn. No tracking analytics are added by this project.</p></section></div>`;
}
function renderTerms() {
  return `<div class="eyebrow">Information / Legal</div><h1 class="page-title">Terms &amp; conditions</h1><p class="lead">Use Python Path to learn, experiment, and build projects respectfully.</p><div class="legal"><section class="panel"><h2>1. Educational use</h2><p>The course is a learning aid for beginners. It is not a replacement for the official Python documentation, a full local Python installation, or a teacher’s advice.</p></section><section class="panel"><h2>2. Code execution</h2><p>Python runs locally in your browser’s worker. Long-running code is terminated after a time limit, but no browser-based environment can promise complete isolation from every browser bug or extension. Do not enter secrets or sensitive information. Do not use this sandbox to run harmful code against other people.</p></section><section class="panel"><h2>3. Accounts and XP</h2><p>Account features require a configured Supabase project. XP is a learning progress measure, not a reward with cash value. Deliberate attempts to manipulate rankings may be removed by the site operator. The public leaderboard shows usernames and XP only for users who opted in.</p></section><section class="panel"><h2>4. Availability and warranty</h2><p>The website is provided as-is. Service availability depends on the hosting, browser-runtime CDN, and database providers. External provider outages can interrupt logins or the code editor.</p></section><section class="panel"><h2>5. Attribution</h2><p>This learning application was created by Zouheir Ghosn. Use and redistribution should follow the repository’s license file.</p></section></div>`;
}
function bindCurrentView() {
  const main = $('#main-content');
  if (!main) return;
  main.addEventListener('input', (event) => {
    if (event.target.id === 'course-search') { state.search = event.target.value; const pos=event.target.selectionStart; render(); const field=$('#course-search'); field?.focus(); field?.setSelectionRange(pos,pos); }
    if (event.target.id === 'reference-search') { state.referenceSearch=event.target.value; const pos=event.target.selectionStart; render(); const field=$('#reference-search'); field?.focus(); field?.setSelectionRange(pos,pos); }
    if (event.target.id === 'code-editor') { const a=currentActivity(); if(a) saveDraft(a.id,event.target.value,$('#input-values')?.value || a.input_values || '',state.solutionUsed); }
    if (event.target.id === 'input-values') { const a=currentActivity(); if(a) saveDraft(a.id,$('#code-editor')?.value || a.starter_code,event.target.value,state.solutionUsed); }
    if (event.target.id === 'sandbox-code' || event.target.id === 'sandbox-input') saveDraft('sandbox',$('#sandbox-code')?.value || '',$('#sandbox-input')?.value || '');
  });
  main.addEventListener('keydown', (event) => {
    if (event.target.matches('textarea.code-editor') && event.key === 'Tab') {
      event.preventDefault(); const field=event.target; const start=field.selectionStart,end=field.selectionEnd;
      if (event.shiftKey) {
        const lineStart=field.value.lastIndexOf('\n',start-1)+1;
        if (field.value.slice(lineStart,lineStart+4)==='    ') { field.setRangeText('',lineStart,lineStart+4,'select'); field.setSelectionRange(Math.max(lineStart,start-4),Math.max(lineStart,end-4)); }
      } else { field.setRangeText('    ',start,end,'end'); }
      field.dispatchEvent(new Event('input',{bubbles:true}));
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault(); const button=main.querySelector('[data-action="check-code"]') || main.querySelector('[data-action="sandbox-run"]'); button?.click();
    }
  });
  main.addEventListener('submit', (event) => handleForm(event));
}

$('#app').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  void handleAction(button.dataset.action, button);
});
async function handleAction(action, button) {
  const id=button.dataset.id;
  clearNotice();
  if (action==='navigate') { state.view=button.dataset.view; state.hintOpen=false; state.solutionOpen=false; render(); window.scrollTo({top:0,behavior:'auto'}); return; }
  if (action==='open-chapter') { state.chapterId=id; state.view='chapter'; state.hintOpen=false;state.solutionOpen=false;render();window.scrollTo({top:0,behavior:'auto'});return; }
  if (action==='open-activity') { state.activityId=id; const a=state.activities.find(x=>x.id===id); state.chapterId=a?.chapter_id||null;state.view='activity';state.hintOpen=false;state.solutionOpen=false;state.lastRun=null;state.solutionUsed=Boolean(getDraft(id)?.usedSolution);render();window.scrollTo({top:0,behavior:'auto'});return; }
  if (action==='repeat-activity') { const a=currentActivity(); if(!a)return; state.solutionUsed=false; state.solutionOpen=false; state.hintOpen=false; state.lastRun=null; saveDraft(a.id,a.starter_code,a.input_values||'',false); render(); window.scrollTo({top:0,behavior:'auto'}); return; }
  if (action==='run-example') { await runActivityCode(true,false); return; }
  if (action==='check-code') { await runActivityCode(false,true); return; }
  if (action==='run-custom') { await runActivityCode(false,false); return; }
  if (action==='reset-code') { const a=currentActivity(); if(!a)return; const code=$('#code-editor');const input=$('#input-values');if(code)code.value=a.starter_code;if(input)input.value=a.input_values||'';state.solutionUsed=false;saveDraft(a.id,a.starter_code,a.input_values||'',false);const f=$('#challenge-feedback');if(f)f.innerHTML='';const o=$('#challenge-console');if(o)o.textContent='Editor reset to the starter code. Solve it on your own to earn any remaining XP.';return; }
  if (action==='toggle-hint') { state.hintOpen=!state.hintOpen; const a=currentActivity(); const holder=$('#hint-holder'); if(holder)holder.innerHTML=state.hintOpen?`<div class="hint-panel"><strong>Hint:</strong> ${esc(a.hint)}</div>`:'';button.textContent=state.hintOpen?'Hide hint':'Need a hint?';return; }
  if (action==='toggle-solution') { state.solutionOpen=!state.solutionOpen; const a=currentActivity(); render(); return; }
  if (action==='use-solution') { const a=currentActivity(); const field=$('#code-editor'); const input=$('#input-values'); if(a&&field){state.solutionUsed=true;field.value=a.solution_code;if(input)input.value=a.input_values||'';saveDraft(a.id,field.value,a.input_values||'',true);field.dispatchEvent(new Event('input',{bubbles:true}));if(input)input.dispatchEvent(new Event('input',{bubbles:true}));}return; }
  if (action==='sandbox-run') { await runSandbox(); return; }
  if (action==='sandbox-clear') { const out=$('#sandbox-output');if(out)out.textContent='';return; }
  if (action==='sandbox-template') { const templates={hello:`print("Hello, world!")`,strings:`print(2 + 5)\nprint("2 + 5")`,loops:`for number in range(1, 6):\n    print(number)`,calculator:`first = float(input("First number: "))\nsecond = float(input("Second number: "))\nprint(f"Total: {first + second}")`};const code=templates[button.dataset.template];if(code!==undefined){$('#sandbox-code').value=code;$('#sandbox-input').value=button.dataset.template==='calculator'?'3\n4':'';saveDraft('sandbox',code,$('#sandbox-input').value);}return; }
  if (action==='account-tab') { state.accountTab=button.dataset.tab;render();return; }
  if (action==='sign-out') { if(state.supabase){const {error}=await state.supabase.auth.signOut();if(error){showAccountMessage(error.message,'bad');return;} }state.user=null;state.profile=null;state.session=null;state.cloudCompleted=new Set();state.backendError='';state.view='account';render();updateHeaderStats();return; }
  if (action==='password-reset') { await sendPasswordReset();return; }
  if (action==='reload-leaderboard') { await maybeLoadLeaderboard(true);render();return; }
  if (action==='copy-reference') { try { await navigator.clipboard.writeText(button.dataset.code||'');button.textContent='Copied'; } catch { button.textContent='Clipboard blocked'; }return; }
  if (action==='delete-account') { await deleteAccount();return; }
}

async function runActivityCode(example, check) {
  const activity=currentActivity(); if(!activity||state.running)return;
  const source=example?activity.example_code:($('#code-editor')?.value ?? activity.starter_code);
  const inputs=example?activity.input_values:($('#input-values')?.value ?? activity.input_values ?? '');
  if(!example)saveDraft(activity.id,source,inputs);
  const outputEl=example?$('#example-console'):$('#challenge-console');const status=$('#run-status');const feedback=$('#challenge-feedback');
  state.running=true;if(status){status.textContent='RUNNING';status.className='tag green';}
  if(outputEl){outputEl.classList.remove('error');outputEl.textContent='Starting Python in a separate worker...';}
  if(feedback)feedback.innerHTML='';
  mainButtonsDisabled(true);
  const result=await executePython(source,inputs);
  state.running=false;mainButtonsDisabled(false);
  if (outputEl) { outputEl.textContent=result.error?`${result.output?result.output+'\n':''}${result.error}`:(result.output||'(No output. Your code ran without printing anything.)');outputEl.classList.toggle('error',Boolean(result.error));outputEl.classList.remove('placeholder'); }
  if(example) return;
  if(status){status.textContent=result.error?'ERROR':'FINISHED';status.className=`tag ${result.error?'':'green'}`;}
  if(result.error){if(check&&feedback)feedback.innerHTML=`<div class="feedback bad"><strong>Your code ran into a Python error.</strong><br>Read the last line first. It usually tells you what to fix. You can edit the code and try again.</div>`;return;}
  state.lastRun={output:cleanOutput(result.output),source,inputs};
  if(!check) return;
  if(cleanOutput(result.output)===cleanOutput(activity.expected_output)) {
    await completeActivity(activity, cleanOutput(result.output), feedback);
  } else if(feedback) {
    feedback.innerHTML=`<div class="feedback bad"><strong>Not quite yet. Your program ran!</strong><br>Compare your output with the target below. Look at spelling, spaces, capital letters, and line breaks. Then edit and run again.</div><details class="hint-panel"><summary>Show target output</summary><pre class="demo-code">${esc(activity.expected_output||'(No output)')}</pre></details>`;
  }
}
function mainButtonsDisabled(disabled) { $$('#main-content button[data-action="check-code"], #main-content button[data-action="run-custom"], #main-content button[data-action="run-example"], #main-content button[data-action="sandbox-run"]').forEach((button)=>button.disabled=disabled); }
async function executePython(code, inputText='') {
  return new Promise((resolve) => {
    let worker; let timer; let settled = false;
    const finish = (result) => { if (settled) return; settled = true; if (timer) clearTimeout(timer); try { worker?.terminate(); } catch {} resolve(result); };
    try {
      // Pyodide's ESM runtime requires a module worker; the worker file itself is same-origin.
      const workerUrl = new URL('./python-worker.js?v=20261028-3', import.meta.url);
      worker = new Worker(workerUrl, { type: 'module', name: 'python-path-runtime' });
      timer = setTimeout(() => finish({ output: '', error: 'Python did not finish starting within 60 seconds. Check your connection to cdn.jsdelivr.net, then refresh and retry.' }), 60000);
      worker.onmessage = (event) => {
        const message = event.data || {}; if (message.id !== 1) return;
        if (message.type === 'ready') { if (timer) clearTimeout(timer); timer = setTimeout(() => finish({ output: '', error: 'Execution timed out after 8 seconds. Check that your loop has a stopping condition.' }), 8000); }
        else if (message.type === 'result') finish(message.result || { output: '', error: 'Python did not return a result.' });
      };
      worker.onerror = (event) => {
        const detail = [event.message, event.filename, event.lineno ? 'line ' + event.lineno : ''].filter(Boolean).join(' ');
        finish({ output: '', error: 'Python worker script could not start at ' + workerUrl.href + '. ' + (detail || 'The browser did not provide a script-loading detail. The new URL also bypasses cached copies of the older worker.') + ' Make sure the latest GitHub Pages deploy has finished, then reload the page.' });
        event.preventDefault?.();
      };
      worker.onmessageerror = () => finish({ output: '', error: 'The browser could not read the Python worker response. Refresh and try again.' });
      worker.postMessage({ id: 1, code: String(code || ''), inputs: String(inputText || '') });
    } catch (error) { finish({ output: '', error: 'Could not start the Python module worker: ' + (error?.message || error) }); }
  });
}
async function completeActivity(activity, output, feedback) {
  const already = isDone(activity.id);
  const requestedPoints = rewardFor(activity, state.solutionUsed);
  if (state.user && state.supabase) {
    try {
      const { data, error } = await state.supabase.rpc('complete_lesson', { p_lesson_id: activity.id, p_output: output, p_used_solution: state.solutionUsed });
      if (error) throw error;
      await refreshCloudProgress(false);
      const granted = Number(data?.xp_awarded || 0);
      let message = '';
      if (data?.awarded && data?.upgraded) message = 'Great comeback! +' + granted + ' XP bonus. You now have the full ' + activity.points + ' XP for this activity.';
      else if (data?.awarded && data?.solution_used) message = 'Challenge passed! +' + granted + ' XP earned (' + granted + ' of ' + activity.points + '). Using the solution is okay—reset and solve it independently later to earn the remaining ' + (activity.points - granted) + ' XP.';
      else if (data?.awarded) message = 'Challenge passed! +' + granted + ' XP earned. You solved it independently—great work!';
      else if (data?.solution_used) message = 'You already earned some XP with the solution. Reset and complete this challenge without inserting the full solution to earn the rest.';
      else message = 'This activity is already complete. Your full XP reward is safe.';
      if (feedback) feedback.innerHTML = '<div class="feedback good"><strong>' + (data?.upgraded ? 'Full credit unlocked!' : 'Nice work!') + '</strong><br>' + esc(message) + '</div>';
      if (data?.awarded) showLevelFeedback(Number(data.total_xp ?? state.profile?.xp ?? 0), granted, feedback);
    } catch (error) {
      if (feedback) feedback.innerHTML = '<div class="feedback bad"><strong>Your code is correct, but cloud progress did not save.</strong><br>' + esc(error.message || 'Database request failed') + '. Keep this page open, check the backend setup, and try again. No online XP was claimed.</div>';
    }
  } else {
    state.local.awards = state.local.awards || {};
    let granted = 0;
    let upgraded = false;
    if (!already) {
      if (!state.local.completed.includes(activity.id)) state.local.completed.push(activity.id);
      granted = requestedPoints;
      state.local.awards[activity.id] = requestedPoints;
    } else {
      const currentAward = Number(state.local.awards[activity.id] ?? activity.points);
      if (!state.solutionUsed && currentAward < activity.points) {
        granted = activity.points - currentAward;
        state.local.awards[activity.id] = activity.points;
        upgraded = true;
      }
    }
    saveLocal();
    const total = localXP();
    let message = '';
    if (upgraded) message = 'Great comeback! +' + granted + ' XP bonus. You now have the full ' + activity.points + ' XP for this activity.';
    else if (granted > 0 && state.solutionUsed) message = 'Challenge passed! +' + granted + ' XP earned (' + granted + ' of ' + activity.points + '). Using the solution is okay—reset and solve it independently later to earn the remaining ' + (activity.points - granted) + ' XP.';
    else if (granted > 0) message = 'Challenge passed! +' + granted + ' XP earned. You solved it independently—great work!';
    else if (state.solutionUsed && Number(state.local.awards[activity.id] ?? activity.points) < activity.points) message = 'You already earned some XP with the solution. Reset and solve this challenge without inserting the full solution to earn the rest.';
    else message = 'This activity is already complete. Your full XP reward is safe.';
    if (feedback) feedback.innerHTML = '<div class="feedback good"><strong>' + (upgraded ? 'Full credit unlocked!' : 'Nice work!') + '</strong><br>' + esc(message) + '</div>';
    if (granted > 0) showLevelFeedback(total, granted, feedback);
  }
  updateHeaderStats();
  const badge = $('.lesson-heading .tag:last-child'); if (badge) { badge.textContent = 'Complete'; badge.classList.add('green'); }
  const repeatButton = $('[data-action="repeat-activity"]'); if (repeatButton && isDone(activity.id)) repeatButton.textContent = '↻ Review this lesson again';
}
function showLevelFeedback(xp,awardedPoints,feedback) {
  const oldLevel=Math.floor(Math.max(0,xp-awardedPoints)/100)+1; const newLevel=Math.floor(xp/100)+1;
  if(newLevel>oldLevel && feedback){const note=document.createElement('p');note.className='small';note.textContent=`Level up! You reached Level ${newLevel}.`;feedback.append(note);}
}
function updateHeaderStats() { const level=$('#top-level');const xp=$('#top-xp');if(level)level.textContent=String(currentLevel());if(xp)xp.textContent=`${currentXP()} XP`; }
async function runSandbox() {
  if(state.running)return; const code=$('#sandbox-code')?.value||'';const inputs=$('#sandbox-input')?.value||'';saveDraft('sandbox',code,inputs);
  const output=$('#sandbox-output');const status=$('#sandbox-status');if(output)output.textContent='Starting Python...';if(status)status.textContent='RUNNING';mainButtonsDisabled(true);state.running=true;
  const result=await executePython(code,inputs);state.running=false;mainButtonsDisabled(false);
  if(output){output.textContent=result.error?`${result.output?result.output+'\n':''}${result.error}`:(result.output||'(No output. Your code ran without printing anything.)');output.classList.toggle('error',Boolean(result.error));}if(status){status.textContent=result.error?'ERROR':'FINISHED';status.className=`tag ${result.error?'':'green'}`;}
}

async function handleForm(event) {
  const form=event.target; if(!form.id)return; event.preventDefault();
  if(form.id==='auth-form') { await submitAuth(form); return; }
  if(form.id==='profile-form') { await saveProfile(form); return; }
  if(form.id==='password-recovery-form') { await setNewPassword(form); return; }
}
async function submitAuth(form) {
  const box=$('#account-message'); const fd=new FormData(form); const email=String(fd.get('email')||'').trim();const password=String(fd.get('password')||'');
  if(!state.supabase){showAccountMessage('Online accounts are not configured yet.','bad');return;}
  if(password.length<10){showAccountMessage('Use a password with at least 10 characters.','bad');return;}
  try {
    if(state.accountTab==='signup') {
      // Creating another account is an explicit identity change. Do not keep a prior session active.
      if (state.user) {
        const { error: signOutError } = await state.supabase.auth.signOut();
        if (signOutError) throw signOutError;
        state.user = null; state.session = null; state.profile = null; state.cloudCompleted = new Set(); state.backendError = '';
        updateHeaderStats();
      }
      const username=String(fd.get('username')||'').trim().toLowerCase();
      if(!validUsername(username)){showAccountMessage('Username must be 3 to 20 letters, numbers, or underscores.','bad');return;}
      const {data,error}=await state.supabase.auth.signUp({email,password,options:{data:{username,leaderboard_public:$('#leaderboard-opt-in')?.checked===true},emailRedirectTo:window.location.href.split('#')[0]}});
      if(error)throw error;
      clearGuestProgress();
      if(data.session){
        if (state.user?.id !== data.user?.id) { state.profile = null; state.cloudCompleted = new Set(); state.backendError = ''; }
        state.user = data.user; state.session = data.session;
        showAccountMessage('Account created. Your profile is ready.','good');state.view='account';await refreshCloudProgress(false,data.user.id);render();
      } else {
        // Email-confirmation signups have no session yet. Ensure old account data is not displayed as the new account's.
        if (state.user) { state.profile = null; state.cloudCompleted = new Set(); }
        showAccountMessage('Check your email for the confirmation link. You will see this account\'s progress after confirming and signing in.','good');
        if (state.view !== 'account') state.view = 'account';
        updateHeaderStats();
      }
    } else {
      const {data,error}=await state.supabase.auth.signInWithPassword({email,password});if(error)throw error;
      clearGuestProgress();
      if (state.user?.id !== data.user.id) { state.profile = null; state.cloudCompleted = new Set(); state.backendError = ''; updateHeaderStats(); }
      state.user=data.user;state.session=data.session;await refreshCloudProgress(false,data.user.id);state.view='account';showNotice('Signed in successfully.','good');render();
    }
  } catch(error) { showAccountMessage(normalizeAuthError(error.message),'bad'); }
}
function normalizeAuthError(message) {
  const text = String(message || 'Request failed.');
  if (/PGRST125|Invalid path specified in request URL/i.test(text)) return 'Supabase returned an invalid API path. Check that config.js contains only the project origin, such as https://YOUR_PROJECT.supabase.co.';
  if (/PGRST205|Could not find the table/i.test(text)) return 'Supabase cannot find a required table. Run the complete supabase/schema.sql from this repository in your Supabase SQL Editor, then refresh the schema cache. Do not disable row-level security.';
  if (/PGRST202|Could not find the function|save_profile/i.test(text)) return 'The profile-saving database function is missing. Run the latest complete supabase/schema.sql from GitHub in the Supabase SQL Editor, wait a few seconds, then refresh this page.';
  if (/invalid login credentials/i.test(text)) return 'Email or password was not accepted. Check them and try again.';
  if (/already registered|already exists/i.test(text)) return 'That email may already have an account. Try signing in.';
  if (/username/i.test(text) && /unique|duplicate/i.test(text)) return 'That username is already in use. Choose another one.';
  return text;
}
function showAccountMessage(message,kind='info') { const el=$('#account-message');if(el){el.innerHTML=`<div class="notice ${kind}">${esc(message)}</div>`;} }
async function saveProfile(form) {
  const username = String(new FormData(form).get('username') || '').trim();
  const isPublic = $('#profile-leaderboard')?.checked === true;
  if (!validUsername(username)) { showAccountMessage('Username must be 3 to 20 letters, numbers, or underscores.', 'bad'); return; }
  if (!state.supabase || !state.user) { showAccountMessage('Sign in again before saving your profile.', 'bad'); return; }
  try {
    const { data, error } = await state.supabase.rpc('save_profile', { p_username: username, p_leaderboard_public: isPublic });
    if (error) throw error;
    if (!data || typeof data !== 'object' || data.id !== state.user.id) throw new Error('The profile response was incomplete. Refresh and try again.');
    state.profile = data; state.backendError = '';
    showAccountMessage('Profile settings saved.', 'good');
    await maybeLoadLeaderboard(false); updateHeaderStats();
  } catch (error) { showAccountMessage(normalizeAuthError(error.message || 'Profile settings could not be saved.'), 'bad'); }
}
async function sendPasswordReset() {
  const email=$('#auth-email')?.value.trim();if(!email){showAccountMessage('Enter your email address first.','bad');return;}
  try {const {error}=await state.supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.href.split('#')[0]});if(error)throw error;showAccountMessage('If an account uses that email, a password reset link will be sent. Check your inbox.','good');}
  catch(error){showAccountMessage(error.message||'Could not send a password reset email.','bad');}
}
async function setNewPassword(form) {
  const password=String(new FormData(form).get('password')||'');if(password.length<10){showAccountMessage('Use a password with at least 10 characters.','bad');return;}
  try {const {error}=await state.supabase.auth.updateUser({password});if(error)throw error;state.recoveryMode=false;showNotice('Password updated. You are signed in.','good');await refreshCloudProgress(false);render();}
  catch(error){showAccountMessage(error.message||'Could not update password.','bad');}
}
async function deleteAccount() {
  const target=$('#delete-message'); if(!state.supabase||!state.user)return;
  if(!window.confirm('Permanently delete your account, XP, profile, and cloud lesson history? This cannot be undone.'))return;
  if(target)target.innerHTML='<div class="notice">Deleting your account...</div>';
  try {const {data,error}=await state.supabase.functions.invoke('delete-account',{method:'POST'});if(error)throw error;if(data?.error)throw new Error(data.error);await state.supabase.auth.signOut();state.user=null;state.session=null;state.profile=null;state.cloudCompleted=new Set();state.view='account';state.accountTab='signin';showNotice('Your account was deleted.','good');render();}
  catch(error){if(target)target.innerHTML=`<div class="notice bad">${esc(error.message||'Account deletion failed.')} Make sure the Supabase Edge Function is deployed and configured.</div>`;}
}
async function maybeLoadLeaderboard(shouldRender=true) {
  if(!configured()||!state.supabase)return;
  try {const {data,error}=await state.supabase.from('leaderboard').select('username,xp').order('xp',{ascending:false}).order('username',{ascending:true}).limit(50);if(error)throw error;state.leaderboardRows=data||[];state.leaderboardError='';}
  catch(error){state.leaderboardError=error.message||'Leaderboard query failed.';}
  if(shouldRender&&state.view==='leaderboard')render();
}

await init();
