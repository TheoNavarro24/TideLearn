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

function buildStaticIndexHtml(title: string, publishUrl: string) {
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
  <meta name="description" content="${safeTitle} - Web package" />
  <link rel="canonical" href="${escapedUrl}" />
  <style>
    html,body{height:100%}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;margin:0;line-height:1.5;background:#0b1020;color:#e2e8f0}
    .frame-wrap{position:fixed;inset:0}
    iframe{width:100%;height:100%;border:0}
  </style>
</head>
<body>
  <div class="frame-wrap">
    <iframe src="${escapedUrl}" title="${safeTitle}" loading="eager" allowfullscreen></iframe>
  </div>
</body>
</html>`;
}

export async function exportStaticWebZip(course: CourseData, publishUrl: string): Promise<Blob> {
  const zip = new JSZip();
  zip.file("index.html", buildStaticIndexHtml(course.title, publishUrl));
  zip.file("course.json", JSON.stringify(course, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}

export function buildScormFileName(title: string) {
  return `${sanitizeFileName(title)}-scorm12.zip`;
}
export function buildStaticFileName(title: string) {
  return `${sanitizeFileName(title)}-web.zip`;
}
