# TideLearn — SCORM Export

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← Design System](09-DESIGN-SYSTEM.md) | [Index](00-INDEX.md) | Next: [Testing →](11-TESTING.md)*

---

## Overview

TideLearn exports courses as **SCORM 1.2** packages — the industry standard for LMS interoperability. SCORM packages are ZIP files containing HTML content, a manifest file, and the SCORM API adapter.

---

## SCORM 1.2 Standard

### What's Included

| Component | Purpose |
|-----------|---------|
| `imsmanifest.xml` | Course metadata, resource inventory, SCO structure |
| `index.html` | Entry point — HTML wrapper with SCORM API calls |
| Content files | Rendered lesson HTML, media assets |
| `adlcp_rootv1p2.xsd` | SCORM schema validation |

### Compatibility

SCORM 1.2 packages work with:
- Moodle
- Blackboard
- Canvas
- Cornerstone
- SAP SuccessFactors
- Most enterprise LMS platforms

---

## Export Pipeline

```
Course JSON
    → Generate imsmanifest.xml (course title, lesson SCOs)
    → Render each lesson to HTML (block renderers)
    → Bundle media assets
    → Package with jszip
    → Download as .zip
```

### Libraries Used

| Library | Purpose |
|---------|---------|
| `jszip` | ZIP file generation in the browser |
| `lz-string` | Optional compression for large courses |

---

## Data Mapping

### Course → SCORM Organization

```xml
<organization identifier="tidelearn-course">
  <title>Course Title</title>
  <item identifier="lesson-1" identifierref="res-lesson-1">
    <title>Lesson 1 Title</title>
  </item>
  <item identifier="lesson-2" identifierref="res-lesson-2">
    <title>Lesson 2 Title</title>
  </item>
</organization>
```

### SCORM Data Model Elements Used

| Element | Purpose |
|---------|---------|
| `cmi.core.lesson_status` | Track completion (incomplete → completed) |
| `cmi.core.score.raw` | Assessment scores |
| `cmi.core.score.min` | Minimum score (0) |
| `cmi.core.score.max` | Maximum score (100) |
| `cmi.suspend_data` | Bookmark/progress data |

---

## Limitations

- **SCORM 1.2 only** — SCORM 2004 and xAPI are not currently supported
- **Client-side generation** — Export happens in the browser; very large courses may be slow
- **Media embedding** — External media (YouTube, Vimeo) requires internet access in the LMS
- **Interactive blocks** — Some interactive blocks (hotspot, branching) have limited SCORM interoperability
