# Five Core Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the five critical issues in TideLearn: dead code removal, SCORM compliance, self-contained static HTML export, Supabase cloud persistence, and reliable shareable links.

**Architecture:** Tasks are ordered by dependency — dead code removal first (clears the path), then SCORM and static HTML fixes (isolated to `src/lib/scorm12.ts` + `src/pages/View.tsx`), then Supabase persistence (touches `src/lib/courses.ts` + pages), then shareable links (depends on persistence being done). Each task is independently shippable.

**Tech Stack:** React 18, TypeScript, Vite, Supabase (PostgreSQL + Auth), lz-string, JSZip, shadcn/ui

---

## File Map

| File | Task | What changes |
|------|------|-------------|
| `src/hooks/use-deep-link-intents.ts` | 1 | DELETE — old broken hook (note: `useDeepLinkIntents.ts` camelCase is the live one — do NOT delete it) |
| `src/hooks/use-intent.ts` | 1 | DELETE — never imported anywhere |
| `src/lib/validate/course.ts` | 1 | DELETE — orphaned, replaced by `/src/validate/` |
| `src/lib/validate/ops.ts` | 1 | DELETE — orphaned (imported only by `use-intent.ts` which is also deleted) |
| `src/lib/patch-engine.ts` | 1 | DELETE — stub with no real implementation |
| `src/pages/Editor.tsx` | 1, 4 | Remove duplicate useEffect; wire Supabase save |
| `src/lib/scorm12.ts` | 2, 3 | Fix SCORM wrapper + rewrite static HTML export |
| `src/pages/View.tsx` | 2 | Send score data in progress messages; track session time |
| `src/lib/courses.ts` | 4 | Add Supabase read/write alongside localStorage |
| `src/pages/Courses.tsx` | 4 | Load course list from Supabase when logged in |
| `src/pages/Editor.tsx` | 5 | Update publish dialog to show correct share URL |

---

## Task 1: Dead Code Removal

**Files:**
- Delete: `src/hooks/use-deep-link-intents.ts` (NOT `useDeepLinkIntents.ts` — that one is active)
- Delete: `src/hooks/use-intent.ts`
- Delete: `src/lib/validate/course.ts`
- Delete: `src/lib/validate/ops.ts`
- Delete: `src/lib/patch-engine.ts`
- Modify: `src/pages/Editor.tsx`

> ⚠️ Do NOT delete `src/components/richtext/RichTextEditor.tsx` or `src/components/richtext/RichTextRenderer.tsx` — they are actively imported by block editor and viewer components.

> ⚠️ Do NOT delete `src/hooks/useDeepLinkIntents.ts` (camelCase) — it is imported by `Editor.tsx`. Only delete `src/hooks/use-deep-link-intents.ts` (kebab-case).

- [ ] **Step 1: Delete the five dead files**

```bash
cd /Users/theonavarro/TideLearn
rm src/hooks/use-deep-link-intents.ts
rm src/hooks/use-intent.ts
rm src/lib/validate/course.ts
rm src/lib/validate/ops.ts
rm src/lib/patch-engine.ts
```

- [ ] **Step 2: Remove the duplicate useEffect in Editor.tsx**

In `src/pages/Editor.tsx`, the deepLink toast effect appears twice (lines 46-50 AND lines 82-86). Remove the second copy (lines 82-86):

```typescript
// REMOVE these lines (the second occurrence of this block):
  useEffect(() => {
    if (deepLink.status !== "idle") {
      toast({ description: deepLink.summary });
    }
  }, [deepLink]);
```

Keep only the first occurrence at lines 46-50.

- [ ] **Step 3: Verify the build passes**

```bash
cd /Users/theonavarro/TideLearn
node_modules/.bin/vite build 2>&1 | tail -20
```

Expected: build completes without errors. If there are import errors referencing the deleted files, fix them by removing those import lines.

- [ ] **Step 4: Verify the dev server still runs**

Open http://localhost:8080 and confirm the editor loads and a course can be saved.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead code (orphaned hooks, validate dir, patch stub)"
```

---

## Task 2: Fix SCORM 1.2 Compliance

**What's broken:**
- Score is never reported to the LMS (quizzes fire events but the wrapper ignores them)
- Required CMI fields are missing: `cmi.core.credit`, `cmi.core.entry`, `cmi.core.score.*`, `cmi.core.session_time`
- Session time is never tracked

**Files:**
- Modify: `src/lib/scorm12.ts`
- Modify: `src/pages/View.tsx`

### 2a — Update View.tsx to send score in progress messages

- [ ] **Step 1: Add score tracking to the progress message type in View.tsx**

Find the `ProgressMessage` interface (around line 33) and add `score`:

```typescript
interface ProgressMessage {
  type: "progress";
  completed: string[];
  lastLessonId: string | null;
  courseCompleted: boolean;
  score: number | null;        // 0–100 percentage, null if no quizzes
  totalQuestions: number;
  correctAnswers: number;
}
```

- [ ] **Step 2: Compute score before sending progress messages**

Find the `useEffect` that posts progress messages to `window.parent` (around line 210 in View.tsx). Replace the message object with one that includes score:

```typescript
useEffect(() => {
  if (!course) return;
  const total = course.lessons.length || 0;
  const courseCompleted = total > 0 && completed.size >= total;

  // Calculate score across all quiz/truefalse/shortanswer blocks
  const allQuizIds: string[] = [];
  for (const lesson of course.lessons) {
    for (const block of lesson.blocks) {
      if (["quiz", "truefalse", "shortanswer"].includes((block as any).type)) {
        allQuizIds.push(block.id);
      }
    }
  }
  const totalQuestions = allQuizIds.length;
  const correctAnswers = allQuizIds.filter((id) => answers[id] === true).length;
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : null;

  try {
    if (window.parent && window.parent !== window) {
      const msg: ProgressMessage = {
        type: "progress",
        completed: Array.from(completed),
        lastLessonId,
        courseCompleted,
        score,
        totalQuestions,
        correctAnswers,
      };
      window.parent.postMessage(msg, "*");
    }
  } catch {}
}, [completed, lastLessonId, course, answers]);
```

### 2b — Update the SCORM wrapper in scorm12.ts to handle score and session time

- [ ] **Step 3: Replace `buildIndexHtml` in src/lib/scorm12.ts**

Replace the entire `buildIndexHtml` function with this version. Key additions:
- Session time tracking (start time recorded at LMSInitialize)
- `cmi.core.credit`, `cmi.core.entry` set on init
- Score received from iframe and sent to LMS
- `cmi.core.session_time` formatted correctly on finish

```typescript
function buildIndexHtml(title: string, publishUrl: string) {
  const safeTitle = title || "Course";
  const escapedUrl = publishUrl
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root{color-scheme:light dark}
    html,body{height:100%;margin:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0b1020;color:#e2e8f0}
    header{padding:12px 16px;border-bottom:1px solid #1f2937;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,0))}
    h1{font-size:16px;margin:0}
    .frame-wrap{position:fixed;inset:48px 0 0 0}
    iframe{width:100%;height:100%;border:0}
    .fallback{padding:16px}
    .btn{appearance:none;border:1px solid #334155;border-radius:8px;padding:.5rem .75rem;background:#0ea5e9;color:white;cursor:pointer}
  </style>
  <script>
  // ── SCORM 1.2 API discovery ──────────────────────────────────────────────
  function findAPI(win) {
    var tries = 0;
    while (win.API == null && win.parent != null && win.parent !== win && tries < 500) {
      tries++; win = win.parent;
    }
    return win.API || null;
  }
  var api = null;
  var childWin = null;
  var startTime = null;

  // Format elapsed seconds as SCORM 1.2 session_time: "HH:MM:SS"
  function formatSessionTime(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function initSCORM() {
    try {
      api = findAPI(window);
      if (!api) { console.warn('SCORM API not found'); return; }
      var ok = api.LMSInitialize('');
      if (ok !== 'true') { console.warn('LMSInitialize failed'); }
      startTime = Date.now();
      // Required CMI fields
      api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
      api.LMSSetValue('cmi.core.credit', 'credit');
      // Check entry: resume if suspend_data exists, else ab-initio
      var existing = api.LMSGetValue('cmi.suspend_data');
      api.LMSSetValue('cmi.core.entry', (existing && existing.length > 2) ? 'resume' : 'ab-initio');
      api.LMSCommit('');
    } catch(e) { console.warn('SCORM init error', e); }
  }

  function finishSCORM() {
    try {
      if (!api) return;
      if (startTime) {
        var elapsed = Math.round((Date.now() - startTime) / 1000);
        api.LMSSetValue('cmi.core.session_time', formatSessionTime(elapsed));
      }
      api.LMSCommit('');
      api.LMSFinish('');
    } catch(e) { console.warn('SCORM finish error', e); }
  }

  function onMessage(e) {
    try {
      var data = e.data || {};
      if (!data || typeof data !== 'object') return;

      if (data.type === 'ready') {
        if (!api) return;
        try {
          var s = api.LMSGetValue('cmi.suspend_data') || '';
          var state = {};
          try { if (s) state = JSON.parse(s); } catch(err) {}
          if (childWin) childWin.postMessage({ type: 'resume', state: state }, '*');
        } catch(err) { console.warn('resume fetch error', err); }
      }

      if (data.type === 'progress') {
        if (!api) return;
        try {
          var state = {
            completed: Array.isArray(data.completed) ? data.completed : [],
            lastLessonId: data.lastLessonId || null
          };
          api.LMSSetValue('cmi.suspend_data', JSON.stringify(state));
          if (data.courseCompleted) {
            api.LMSSetValue('cmi.core.lesson_status', 'completed');
          }
          // Report score if available
          if (data.score !== null && data.score !== undefined) {
            api.LMSSetValue('cmi.core.score.raw', String(data.score));
            api.LMSSetValue('cmi.core.score.min', '0');
            api.LMSSetValue('cmi.core.score.max', '100');
          }
          api.LMSCommit('');
        } catch(err) { console.warn('progress commit error', err); }
      }
    } catch(err) { console.warn('message error', err); }
  }

  window.addEventListener('message', onMessage);
  window.addEventListener('load', function() {
    initSCORM();
    var frame = document.getElementById('courseFrame');
    childWin = frame ? frame.contentWindow : null;
  });
  window.addEventListener('beforeunload', finishSCORM);
  </script>
</head>
<body>
  <header><h1>${safeTitle}</h1></header>
  <div class="frame-wrap">
    <iframe id="courseFrame" src="${escapedUrl}" title="${safeTitle}" loading="eager" allowfullscreen></iframe>
  </div>
  <noscript>
    <div class="fallback">JavaScript is required. <a class="btn" href="${escapedUrl}" target="_blank" rel="noopener">Open course</a></div>
  </noscript>
</body>
</html>`;
}
```

- [ ] **Step 4: Verify the build still passes**

```bash
cd /Users/theonavarro/TideLearn
node_modules/.bin/vite build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Manual test with SCORM Cloud**

1. In the editor at http://localhost:8080, create a course with at least one Quiz block and one True/False block.
2. Click Publish → Export → "Export SCORM 1.2". Save the `.zip` file.
3. Go to **scormcloud.com** (free account) → Upload the zip → Launch the course.
4. Answer the quiz questions. Complete the course.
5. Check SCORM Cloud's registration report. Confirm:
   - `lesson_status` = "completed"
   - `score.raw` = a number (e.g. "100" if all correct)
   - `session_time` is populated (e.g. "00:02:15")

- [ ] **Step 6: Commit**

```bash
git add src/lib/scorm12.ts src/pages/View.tsx
git commit -m "fix: SCORM 1.2 compliance — score tracking, session time, required CMI fields"
```

---

## Task 3: Self-Contained Static HTML Export

**What's broken:** `exportStaticWebZip` produces an `index.html` that iframes the *live TideLearn URL*. If the app moves or goes offline, the export breaks.

**Fix:** Embed the course data directly in `index.html` as a JavaScript variable, and include a self-contained vanilla JS renderer. No external URLs needed.

**Files:**
- Modify: `src/lib/scorm12.ts` — replace `buildStaticIndexHtml` and `exportStaticWebZip`

- [ ] **Step 1: Replace `buildStaticIndexHtml` in src/lib/scorm12.ts**

Replace the existing `buildStaticIndexHtml` function (and update `exportStaticWebZip`) with this self-contained version:

```typescript
function buildStaticIndexHtml(courseJson: string, title: string): string {
  const safeTitle = title || "Course";
  // Escape the JSON so it can be safely embedded in a <script> tag
  const escapedJson = courseJson.replace(/<\/script>/gi, '<\\/script>');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    *{box-sizing:border-box}
    html,body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;background:#fff;color:#1a202c}
    header{background:#1e293b;color:#f8fafc;padding:1rem 1.5rem}
    header h1{margin:0;font-size:1.25rem}
    nav{background:#f1f5f9;border-bottom:1px solid #e2e8f0;padding:.5rem 1.5rem;display:flex;gap:.5rem;flex-wrap:wrap}
    nav button{background:none;border:1px solid #cbd5e1;border-radius:.375rem;padding:.25rem .75rem;cursor:pointer;font-size:.875rem;color:#475569}
    nav button.active{background:#3b82f6;color:#fff;border-color:#3b82f6}
    main{max-width:800px;margin:0 auto;padding:2rem 1.5rem}
    h2{font-size:1.5rem;font-weight:700;margin-top:0}
    h3{font-size:1.125rem;font-weight:600;margin-top:1.5rem}
    p{margin:.5rem 0 1rem}
    .callout{border-radius:.5rem;padding:1rem;margin:1rem 0}
    .callout.info{background:#eff6ff;border-left:4px solid #3b82f6}
    .callout.success{background:#f0fdf4;border-left:4px solid #22c55e}
    .callout.warning{background:#fffbeb;border-left:4px solid #f59e0b}
    .callout.danger{background:#fef2f2;border-left:4px solid #ef4444}
    .callout-title{font-weight:700;margin-bottom:.25rem}
    blockquote{border-left:4px solid #e2e8f0;margin:1rem 0;padding:.5rem 1rem;color:#64748b}
    blockquote cite{display:block;font-size:.875rem;margin-top:.5rem}
    pre{background:#1e293b;color:#e2e8f0;border-radius:.5rem;padding:1rem;overflow-x:auto;font-size:.875rem}
    hr{border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0}
    img{max-width:100%;border-radius:.5rem}
    .video-wrap{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:.5rem;margin:1rem 0}
    .video-wrap iframe,.video-wrap video{position:absolute;inset:0;width:100%;height:100%;border:0}
    ul,ol{padding-left:1.5rem;margin:.5rem 0}
    .quiz{background:#f8fafc;border:1px solid #e2e8f0;border-radius:.5rem;padding:1rem;margin:1rem 0}
    .quiz p{font-weight:600;margin-bottom:.5rem}
    .quiz label{display:flex;align-items:center;gap:.5rem;padding:.375rem 0;cursor:pointer}
    .quiz button{background:#3b82f6;color:#fff;border:none;border-radius:.375rem;padding:.375rem .875rem;cursor:pointer;margin-top:.5rem;font-size:.875rem}
    .quiz button:disabled{background:#94a3b8;cursor:not-allowed}
    .quiz .feedback{margin-top:.5rem;padding:.5rem;border-radius:.375rem;font-size:.875rem}
    .quiz .feedback.correct{background:#dcfce7;color:#166534}
    .quiz .feedback.incorrect{background:#fee2e2;color:#991b1b}
    .accordion details{border:1px solid #e2e8f0;border-radius:.5rem;margin:.5rem 0}
    .accordion summary{padding:.75rem 1rem;cursor:pointer;font-weight:600;list-style:none}
    .accordion summary::-webkit-details-marker{display:none}
    .accordion-body{padding:.75rem 1rem;border-top:1px solid #e2e8f0}
    .tabs-bar{display:flex;gap:.5rem;border-bottom:2px solid #e2e8f0;margin-bottom:1rem}
    .tabs-bar button{background:none;border:none;padding:.5rem 1rem;cursor:pointer;color:#64748b;border-bottom:2px solid transparent;margin-bottom:-2px}
    .tabs-bar button.active{color:#3b82f6;border-bottom-color:#3b82f6;font-weight:600}
    .nav-footer{display:flex;justify-content:space-between;margin-top:2rem;padding-top:1rem;border-top:1px solid #e2e8f0}
    .nav-footer button{background:#3b82f6;color:#fff;border:none;border-radius:.5rem;padding:.5rem 1.25rem;cursor:pointer;font-size:.875rem}
    .nav-footer button:disabled{background:#cbd5e1;cursor:not-allowed}
    .progress-bar{height:4px;background:#e2e8f0;position:fixed;top:0;left:0;right:0;z-index:100}
    .progress-bar-fill{height:100%;background:#3b82f6;transition:width .3s}
  </style>
</head>
<body>
  <div class="progress-bar"><div class="progress-bar-fill" id="progress"></div></div>
  <header><h1 id="course-title"></h1></header>
  <nav id="lesson-nav"></nav>
  <main id="content"></main>

  <script>
  var COURSE = ${escapedJson};

  var currentIdx = 0;

  function videoEmbed(url) {
    var ytMatch = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([\\w-]+)/);
    if (ytMatch) return '<iframe src="https://www.youtube.com/embed/' + ytMatch[1] + '" allowfullscreen></iframe>';
    var viMatch = url.match(/vimeo\\.com\\/(\\d+)/);
    if (viMatch) return '<iframe src="https://player.vimeo.com/video/' + viMatch[1] + '" allowfullscreen></iframe>';
    return '<video controls src="' + url + '"></video>';
  }

  // NOTE: text, accordion content, and tabs content are stored as HTML strings
  // (produced by RichTextEditor/TipTap). These fields must be inserted as innerHTML,
  // NOT escaped with esc(). All other string fields (titles, captions, etc.) use esc().
  function renderBlock(b) {
    switch(b.type) {
      case 'heading': return '<h3>' + esc(b.text) + '</h3>';
      case 'text': return '<div class="rich-text">' + (b.text || '') + '</div>';  // HTML content — no esc()
      case 'image': return b.src ? '<img src="' + esc(b.src) + '" alt="' + esc(b.alt||'') + '">' : '';
      case 'video': return '<div class="video-wrap">' + videoEmbed(b.url) + '</div>';
      case 'audio': return '<figure><figcaption>' + esc(b.title||'Audio') + '</figcaption><audio controls src="' + esc(b.src) + '"></audio></figure>';
      case 'list':
        var tag = b.style==='numbered' ? 'ol' : 'ul';
        return '<'+tag+'>' + (b.items||[]).map(function(i){return '<li>'+esc(i)+'</li>'}).join('') + '</'+tag+'>';
      case 'quote':
        return '<blockquote>' + esc(b.text) + (b.cite ? '<cite>— '+esc(b.cite)+'</cite>' : '') + '</blockquote>';
      case 'divider': return '<hr>';
      case 'callout':
        return '<div class="callout ' + b.variant + '">' + (b.title ? '<div class="callout-title">'+esc(b.title)+'</div>' : '') + esc(b.text) + '</div>';
      case 'code': return '<pre><code>' + esc(b.code) + '</code></pre>';
      case 'accordion':
        return '<div class="accordion">' + (b.items||[]).map(function(item){
          // item.content is HTML from RichTextEditor — use as innerHTML, not escaped
          return '<details><summary>'+esc(item.title)+'</summary><div class="accordion-body">'+(item.content||'')+'</div></details>';
        }).join('') + '</div>';
      case 'tabs': return renderTabs(b);
      case 'quiz': return renderQuiz(b);
      case 'truefalse': return renderTrueFalse(b);
      case 'shortanswer': return renderShortAnswer(b);
      case 'toc': return renderTOC();
      default: return '';
    }
  }

  function renderTOC() {
    return '<nav class="toc"><ul>' + COURSE.lessons.map(function(l,i){
      return '<li><a href="#" onclick="goTo('+i+');return false">'+esc(l.title)+'</a></li>';
    }).join('') + '</ul></nav>';
  }

  function renderTabs(b) {
    var id = 'tabs-' + b.id;
    var html = '<div class="tabs" id="'+id+'"><div class="tabs-bar">';
    (b.items||[]).forEach(function(item,i){
      html += '<button onclick="switchTab(\\''+id+'\\','+i+')" class="'+(i===0?'active':'')+'" id="'+id+'-btn-'+i+'">'+esc(item.label)+'</button>';
    });
    html += '</div>';
    (b.items||[]).forEach(function(item,i){
      // item.content is HTML from RichTextEditor — use as innerHTML, not escaped
      html += '<div id="'+id+'-panel-'+i+'" style="'+(i===0?'':'display:none')+'">'+(item.content||'')+'</div>';
    });
    return html + '</div>';
  }

  function switchTab(tabsId, idx) {
    var container = document.getElementById(tabsId);
    if (!container) return;
    container.querySelectorAll('.tabs-bar button').forEach(function(b,i){ b.classList.toggle('active',i===idx); });
    var panels = container.querySelectorAll('[id^="'+tabsId+'-panel-"]');
    panels.forEach(function(p,i){ p.style.display = i===idx ? '' : 'none'; });
  }

  function renderQuiz(b) {
    var id = 'quiz-' + b.id;
    var html = '<div class="quiz" id="'+id+'"><p>'+esc(b.question)+'</p>';
    (b.options||[]).forEach(function(opt,i){
      html += '<label><input type="radio" name="'+id+'" value="'+i+'"> '+esc(opt)+'</label>';
    });
    html += '<br><button onclick="checkQuiz(\\''+id+'\\','+b.correctIndex+')" id="'+id+'-btn">Submit</button>';
    html += '<div class="feedback" id="'+id+'-fb"></div></div>';
    return html;
  }

  function checkQuiz(id, correctIndex) {
    var sel = document.querySelector('input[name="'+id+'"]:checked');
    var fb = document.getElementById(id+'-fb');
    var btn = document.getElementById(id+'-btn');
    if (!sel) { if(fb) fb.textContent = 'Please select an answer.'; return; }
    var correct = parseInt(sel.value) === correctIndex;
    if (fb) { fb.textContent = correct ? '✓ Correct!' : '✗ Incorrect — try again.'; fb.className = 'feedback ' + (correct?'correct':'incorrect'); }
    if (btn && correct) btn.disabled = true;
  }

  function renderTrueFalse(b) {
    var id = 'tf-' + b.id;
    return '<div class="quiz" id="'+id+'"><p>'+esc(b.question)+'</p>' +
      '<label><input type="radio" name="'+id+'" value="true"> True</label>' +
      '<label><input type="radio" name="'+id+'" value="false"> False</label>' +
      '<br><button onclick="checkTF(\\''+id+'\\','+b.correct+',\\''+esc(b.feedbackCorrect||'Correct!')+'\\',' +
      '\\''+esc(b.feedbackIncorrect||'Incorrect.')+'\\')">Submit</button>' +
      '<div class="feedback" id="'+id+'-fb"></div></div>';
  }

  function checkTF(id, correct, fbCorrect, fbWrong) {
    var sel = document.querySelector('input[name="'+id+'"]:checked');
    var fb = document.getElementById(id+'-fb');
    if (!sel) { if(fb) fb.textContent = 'Please select an answer.'; return; }
    var isCorrect = (sel.value === 'true') === correct;
    if (fb) { fb.textContent = isCorrect ? fbCorrect : fbWrong; fb.className = 'feedback ' + (isCorrect?'correct':'incorrect'); }
  }

  function renderShortAnswer(b) {
    var id = 'sa-' + b.id;
    return '<div class="quiz" id="'+id+'"><p>'+esc(b.question)+'</p>' +
      '<input type="text" id="'+id+'-input" style="width:100%;padding:.375rem .75rem;border:1px solid #cbd5e1;border-radius:.375rem;margin:.5rem 0">' +
      '<br><button onclick="checkSA(\\''+id+'\\',\\''+esc(b.answer)+'\\','+!!b.caseSensitive+','+!!b.trimWhitespace+')">Submit</button>' +
      '<div class="feedback" id="'+id+'-fb"></div></div>';
  }

  function checkSA(id, answer, caseSensitive, trim) {
    var input = document.getElementById(id+'-input');
    var fb = document.getElementById(id+'-fb');
    if (!input || !fb) return;
    var val = input.value;
    var ans = answer;
    if (trim) { val = val.trim(); ans = ans.trim(); }
    if (!caseSensitive) { val = val.toLowerCase(); ans = ans.toLowerCase(); }
    var correct = val === ans;
    fb.textContent = correct ? '✓ Correct!' : '✗ Not quite — try again.';
    fb.className = 'feedback ' + (correct?'correct':'incorrect');
  }

  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderLesson(idx) {
    var lesson = COURSE.lessons[idx];
    if (!lesson) return;
    currentIdx = idx;
    var html = '<h2>' + esc(lesson.title) + '</h2>';
    (lesson.blocks||[]).forEach(function(b){ html += renderBlock(b); });
    var total = COURSE.lessons.length;
    html += '<div class="nav-footer">';
    html += '<button onclick="goTo('+(idx-1)+')" '+(idx===0?'disabled':'')+'>← Previous</button>';
    html += '<button onclick="goTo('+(idx+1)+')" '+(idx===total-1?'disabled':'')+'>Next →</button>';
    html += '</div>';
    document.getElementById('content').innerHTML = html;
    var pct = total > 1 ? Math.round((idx/(total-1))*100) : 100;
    document.getElementById('progress').style.width = pct + '%';
    document.querySelectorAll('#lesson-nav button').forEach(function(b,i){ b.classList.toggle('active',i===idx); });
    window.scrollTo(0,0);
  }

  function goTo(idx) {
    if (idx < 0 || idx >= COURSE.lessons.length) return;
    renderLesson(idx);
  }

  // Build nav and render first lesson
  document.getElementById('course-title').textContent = COURSE.title;
  var nav = document.getElementById('lesson-nav');
  COURSE.lessons.forEach(function(l,i){
    var btn = document.createElement('button');
    btn.textContent = l.title;
    btn.onclick = function(){ goTo(i); };
    nav.appendChild(btn);
  });
  renderLesson(0);
  </script>
</body>
</html>`;
}
```

- [ ] **Step 2: Update `exportStaticWebZip` to pass course JSON (not publishUrl)**

Find `exportStaticWebZip` in `src/lib/scorm12.ts` and replace it:

```typescript
export async function exportStaticWebZip(course: CourseData, _publishUrl: string): Promise<Blob> {
  const zip = new JSZip();
  const courseJson = JSON.stringify(course, null, 2);
  zip.file("index.html", buildStaticIndexHtml(courseJson, course.title));
  zip.file("course.json", courseJson);
  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}
```

Also update the `buildStaticIndexHtml` signature — it now takes `courseJson: string` instead of `publishUrl: string`, so update the function definition accordingly (you already did this in Step 1).

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/theonavarro/TideLearn
node_modules/.bin/vite build 2>&1 | tail -20
```

- [ ] **Step 4: Manual test**

1. In the editor, create a course with a heading, text, image, and a quiz.
2. Click Publish → Export → "Export Static Web Zip".
3. Unzip the file to a local folder.
4. Open `index.html` in a browser **directly** (double-click, or `open index.html`) — no web server needed.
5. Confirm: all lessons show, quiz works, Previous/Next navigation works.
6. Disconnect from the internet. Reload. Confirm it still works.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scorm12.ts
git commit -m "fix: static HTML export is now fully self-contained with embedded vanilla JS renderer"
```

---

## Task 4: Supabase Cloud Persistence

**What's broken:** Courses are only saved in the browser's localStorage. Clearing the browser deletes everything. Can't use from another device.

**Fix:** When a user is logged in, save courses to the Supabase `courses` table (which already exists). Keep localStorage as a fallback for when not logged in.

**Files:**
- Modify: `src/lib/courses.ts`
- Modify: `src/pages/Courses.tsx`
- Modify: `src/pages/Editor.tsx`

- [ ] **Step 1: Add Supabase course functions to src/lib/courses.ts**

First, add this import to the **top** of `src/lib/courses.ts` (alongside the existing imports):

```typescript
import { supabase } from "@/integrations/supabase/client";
```

Then add these functions at the **bottom** of `src/lib/courses.ts`. These are cloud equivalents of the existing localStorage functions:

```typescript

/** Load all courses for the current logged-in user from Supabase */
export async function loadCoursesFromCloud(): Promise<CourseIndexItem[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

/** Save or update a course in Supabase.
 *  is_public defaults to true so that share links work for anyone,
 *  including visitors who are not logged in.
 */
export async function saveCourseToCloud(
  id: string,
  course: Course,
  userId: string
): Promise<void> {
  await supabase.from("courses").upsert({
    id,
    user_id: userId,
    title: course.title || "Untitled Course",
    content: course as unknown as import("@/integrations/supabase/types").Json,
    is_public: true,
    updated_at: new Date().toISOString(),
  });
}

/** Delete a course from Supabase */
export async function deleteCourseFromCloud(id: string): Promise<void> {
  await supabase.from("courses").delete().eq("id", id);
}

/** Load a single course from Supabase.
 *  Works for unauthenticated visitors as long as is_public = true (RLS policy allows it).
 */
export async function loadCourseFromCloud(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("content")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data.content as unknown as Course;
}
```

- [ ] **Step 2: Update Courses.tsx to use cloud storage when logged in**

In `src/pages/Courses.tsx`, find where the course list is loaded (look for `getCoursesIndex()`). The pattern to follow: on mount, if the user is logged in (check `AuthContext`), load from cloud; otherwise load from localStorage.

First, find the AuthContext import. It will be something like:
```typescript
import { useAuth } from "@/components/auth/AuthContext";
```
If not already imported, add it.

Then replace the course-loading logic in the `useEffect` (wherever `getCoursesIndex` is called) with:

```typescript
const { user } = useAuth();

useEffect(() => {
  async function loadCourses() {
    if (user) {
      const cloudCourses = await loadCoursesFromCloud();
      setCourses(cloudCourses);
    } else {
      setCourses(getCoursesIndex());
    }
  }
  loadCourses();
}, [user]);
```

Also update the delete handler to call `deleteCourseFromCloud(id)` when `user` is set.

- [ ] **Step 3: Update Editor.tsx to save to cloud when logged in**

In `src/pages/Editor.tsx`, find the `saveNow` function (around line 186). Update it to also save to cloud:

```typescript
import { useAuth } from "@/components/auth/AuthContext";
import { saveCourseToCloud, loadCourseFromCloud } from "@/lib/courses";

// Inside the component:
const { user } = useAuth();

const saveNow = async () => {
  try {
    if (courseId) {
      saveCourse(courseId, courseData as any); // always save locally
      if (user) {
        await saveCourseToCloud(courseId, courseData as any, user.id);
      }
    } else {
      localStorage.setItem("editor:course", JSON.stringify(courseData));
    }
    toast({ title: "Saved" });
  } catch (e) {
    toast({ title: "Save failed" });
  }
};
```

Also update the load logic: in the `useEffect` that calls `loadCourse(courseId)` (around line 58), add a fallback to cloud if localStorage is empty:

```typescript
useEffect(() => {
  async function loadInitialCourse() {
    if (courseId) {
      let loaded = loadCourse(courseId); // try localStorage first
      if (!loaded && user) {
        loaded = await loadCourseFromCloud(courseId); // fallback to cloud
        if (loaded) saveCourse(courseId, loaded); // cache locally
      }
      if (loaded?.lessons?.length) {
        setCourseTitle(loaded.title || "My Course");
        setLessons(loaded.lessons);
        setSelectedLessonId(loaded.lessons[0]?.id ?? defaultLesson.id);
      }
      return;
    }
    const raw = localStorage.getItem("editor:course");
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved?.lessons?.length) {
        setCourseTitle(saved.title || "My Course");
        setLessons(saved.lessons);
        setSelectedLessonId(saved.lessons[0]?.id ?? defaultLesson.id);
      }
    } catch (e) {
      console.warn("Failed to load autosave", e);
    }
  }
  loadInitialCourse();
}, [courseId, user]);
```

- [ ] **Step 4: Also update the debounced autosave in Editor.tsx to save to cloud**

Find the `useEffect` with `saveTimer` (around line 198). Update it to also save to cloud:

```typescript
useEffect(() => {
  if (saveTimer.current) window.clearTimeout(saveTimer.current);
  saveTimer.current = window.setTimeout(async () => {
    try {
      if (courseId) {
        saveCourse(courseId, courseData as any);
        if (user) {
          await saveCourseToCloud(courseId, courseData as any, user.id);
        }
      } else {
        localStorage.setItem("editor:course", JSON.stringify(courseData));
      }
    } catch {}
  }, 1000); // slightly longer debounce (1s) since cloud save has latency
  return () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current!);
  };
}, [courseTitle, lessons, courseId, user]);
```

- [ ] **Step 5: Build and test**

```bash
cd /Users/theonavarro/TideLearn
node_modules/.bin/vite build 2>&1 | tail -20
```

Manual test:
1. Log in at http://localhost:8080
2. Create a course. Add a lesson. Click Save.
3. Open a new incognito window. Log in. Go to Courses. Confirm the course appears.
4. Edit the course from the new window. Confirm changes are saved.
5. Log out. Confirm courses page is empty (or shows only local courses).

- [ ] **Step 6: Commit**

```bash
git add src/lib/courses.ts src/pages/Courses.tsx src/pages/Editor.tsx
git commit -m "feat: save courses to Supabase when logged in, with localStorage fallback"
```

---

## Task 5: Fix Shareable Links

**What's broken:** Share links embed the entire course as compressed data in the URL. Large courses produce URLs that are thousands of characters long, which can break in some tools (WhatsApp, email clients, etc.).

**Fix:** When the user is logged in, use the Supabase `courses` table `id` to generate a clean short URL (`/view?id=<courseId>`) instead of compressing all the data into the URL. The hash-based approach stays as fallback for anonymous/not-logged-in use.

**Files:**
- Modify: `src/pages/View.tsx` — handle `?id=<courseId>` param
- Modify: `src/pages/Editor.tsx` — change publishUrl when logged in

- [ ] **Step 1: Fix localStorage storage keys in View.tsx to avoid collisions with ?id= URLs**

In `src/pages/View.tsx`, find `storageKey` (around line 99) and `progressKey` (around line 125). Both currently derive from `window.location.hash.slice(1)`, which will be empty for `?id=` URLs, causing all cloud-loaded courses to share the same key and corrupt each other's state.

Replace both:

```typescript
// REPLACE this (line ~99):
const storageKey = useMemo(() => "quizAnswers:" + window.location.hash.slice(1), []);

// WITH this:
const storageKey = useMemo(() => {
  const p = new URLSearchParams(window.location.search);
  const id = p.get("id");
  return "quizAnswers:" + (id ? `id:${id}` : window.location.hash.slice(1));
}, []);
```

```typescript
// REPLACE this (line ~125):
const progressKey = useMemo(() => "courseProgress:" + window.location.hash.slice(1), []);

// WITH this:
const progressKey = useMemo(() => {
  const p = new URLSearchParams(window.location.search);
  const id = p.get("id");
  return "courseProgress:" + (id ? `id:${id}` : window.location.hash.slice(1));
}, []);
```

- [ ] **Step 3: Update View.tsx to load course by ID from Supabase**

In `src/pages/View.tsx`, find the `useEffect` that decompresses from `window.location.hash` (around line 43). Replace it entirely:

```typescript
import { loadCourseFromCloud } from "@/lib/courses";

useEffect(() => {
  async function loadCourse() {
    // Option 1: load by course ID (clean URL, requires Supabase)
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");
    if (courseId) {
      const course = await loadCourseFromCloud(courseId);
      if (course) {
        const result = courseSchema.safeParse(course);
        if (result.success) {
          setCourse(result.data as Course);
          return;
        }
      }
      setError("Course not found");
      return;
    }

    // Option 2: load from URL hash (legacy / anonymous sharing)
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    try {
      const json = decompressFromEncodedURIComponent(hash);
      if (json) {
        const parsed = JSON.parse(json);
        const result = courseSchema.safeParse(parsed);
        if (result.success) {
          setCourse(result.data as Course);
        } else {
          setError("Invalid course data");
        }
      }
    } catch (e) {
      setError("Failed to parse course");
    }
  }
  loadCourse();
}, []);
```

- [ ] **Step 4: Update Editor.tsx to generate a clean share URL when logged in**

In `src/pages/Editor.tsx`, find the `publishUrl` useMemo (around line 181):

```typescript
const publishUrl = useMemo(() => `${window.location.origin}/view#${compressedHash}`,[compressedHash]);
```

Replace with:

```typescript
const publishUrl = useMemo(() => {
  // When the user is logged in and has a courseId, use a clean /view?id= URL
  if (user && courseId) {
    return `${window.location.origin}/view?id=${courseId}`;
  }
  // Fallback: compress course data into the URL hash (works without login)
  return `${window.location.origin}/view#${compressedHash}`;
}, [user, courseId, compressedHash]);
```

- [ ] **Step 5: Build and test**

```bash
cd /Users/theonavarro/TideLearn
node_modules/.bin/vite build 2>&1 | tail -20
```

Manual test:
1. Log in and open a course in the editor.
2. Click Publish. Copy the Shareable URL. It should now look like `http://localhost:8080/view?id=abc-123` (short and clean).
3. Open the URL in a new tab. Course loads correctly.
4. Answer a quiz question, navigate away, return — answers are still there.
5. Test fallback: log out, create a course (it will have no courseId). The URL should still be a hash-based URL.

- [ ] **Step 6: Commit**

```bash
git add src/pages/View.tsx src/pages/Editor.tsx
git commit -m "feat: use clean /view?id= share URLs for logged-in users, hash fallback for anonymous"
```

---

## Testing Checklist

After all 5 tasks are complete, run through this end-to-end:

- [ ] Build passes: `node_modules/.bin/vite build`
- [ ] Editor loads, course can be created and saved
- [ ] Saving while logged in: course appears in Courses list after refresh
- [ ] SCORM export: upload to SCORM Cloud, complete course, verify score in report
- [ ] Static HTML export: extract zip, open index.html offline, all blocks render
- [ ] Share URL (logged in): clean short URL, course loads at that URL
- [ ] Share URL (logged out): hash URL, course still loads

---

## Notes for Implementation

- The Supabase `courses` table already exists with the right schema — no migration needed.
- The `supabase` client is already configured in `src/integrations/supabase/client.ts`.
- The `AuthContext` already provides `user` — use `useAuth()` to access it.
- No test framework is configured in this project — all verification is manual + build checks.
- The SCORM Cloud test (Task 2, Step 5) is the most important manual test — do not skip it.
