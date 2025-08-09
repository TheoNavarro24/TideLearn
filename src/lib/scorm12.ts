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
  // Minimal SCORM 1.2 wrapper that marks complete on load and offers a launch button
  const safeTitle = title || "Course";
  const escapedUrl = publishUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root{color-scheme:light dark}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;margin:0;padding:2rem;line-height:1.5}
    .card{max-width:860px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;padding:1.25rem}
    h1{font-size:1.5rem;margin:0 0 .5rem 0}
    .actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem}
    .btn{appearance:none;border:1px solid #334155;border-radius:8px;padding:.5rem .75rem;background:#0ea5e9;color:white;cursor:pointer}
    .btn.secondary{background:transparent;color:#0ea5e9;border-color:#0ea5e9}
    .small{font-size:.875rem;color:#475569}
  </style>
  <script>
  // Minimal SCORM 1.2 API discovery and set complete
  function findAPI(win){var maxTries=500;while((win.API==null) && (win.parent!=null) && (win.parent!=win) && (maxTries>0)){maxTries--;win = win.parent;}return win.API||null;}
  function initAndComplete(){try{var api=findAPI(window);if(!api){console.warn('SCORM API not found');return}var ok=api.LMSInitialize("");if(ok!="true"){console.warn('LMSInitialize failed')}api.LMSSetValue('cmi.core.lesson_status','completed');api.LMSCommit("");window.addEventListener('beforeunload',function(){try{api.LMSFinish("")}catch(e){}});}catch(e){console.warn('SCORM init error',e)}}
  window.addEventListener('load', initAndComplete);
  </script>
</head>
<body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <p class="small">This SCO reports completion automatically. Use the button below to open the course.</p>
    <div class="actions">
      <a class="btn" href="${escapedUrl}" target="_blank" rel="noopener">Open course</a>
      <button class="btn secondary" onclick="location.reload()">Report completion again</button>
    </div>
  </div>
</body>
</html>`;
}

export async function exportScorm12Zip(course: CourseData, publishUrl: string): Promise<Blob> {
  const zip = new JSZip();
  zip.file("imsmanifest.xml", buildManifest(course.title));
  zip.file("index.html", buildIndexHtml(course.title, publishUrl));
  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}

export function buildScormFileName(title: string) {
  return `${sanitizeFileName(title)}-scorm12.zip`;
}
