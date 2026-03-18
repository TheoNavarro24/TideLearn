import JSZip from "jszip";

export interface CourseData {
  title: string;
  lessons: any[];
}

function sanitizeFileName(name: string) {
  return (name || "course").toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "course";
}

function buildManifest(title: string) {
  const safeTitle = title || "Course";
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.course" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG1">
    <organization identifier="ORG1" structure="hierarchical">
      <title>${safeTitle}</title>
      <item identifier="ITEM1" identifierref="RES1" isvisible="true">
        <title>${safeTitle}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
}

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

export async function exportScorm12Zip(course: CourseData, publishUrl: string): Promise<Blob> {
  const zip = new JSZip();
  zip.file("imsmanifest.xml", buildManifest(course.title));
  zip.file("index.html", buildIndexHtml(course.title, publishUrl));
  // Include raw course for robust re-import
  zip.file("course.json", JSON.stringify(course, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}

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
      '<br><button onclick="checkSA(\\''+id+'\\',\\''+escJs(b.answer)+'\\','+!!b.caseSensitive+','+!!b.trimWhitespace+')">Submit</button>' +
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

  function escJs(s) {
    return String(s||'').replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'");
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

export async function exportStaticWebZip(course: CourseData, _publishUrl: string): Promise<Blob> {
  const zip = new JSZip();
  const courseJson = JSON.stringify(course, null, 2);
  zip.file("index.html", buildStaticIndexHtml(courseJson, course.title));
  zip.file("course.json", courseJson);
  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}

export function buildScormFileName(title: string) {
  return `${sanitizeFileName(title)}-scorm12.zip`;
}
export function buildStaticFileName(title: string) {
  return `${sanitizeFileName(title)}-web.zip`;
}
