# TideLearn — Data Model

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← Architecture](02-ARCHITECTURE.md) | [Index](00-INDEX.md) | Next: [Authentication →](04-AUTHENTICATION-AUTHORIZATION.md)*

---

## Overview

TideLearn has two data layers:

1. **Supabase (PostgreSQL)** — User profiles, course metadata, course JSON, media files
2. **Course JSON** — The full course structure stored as a JSONB column, fully typed with Zod schemas

---

## 1. Supabase Schema

### profiles

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- SELECT: any authenticated user can read profiles
-- INSERT: users can insert their own profile
-- UPDATE: users can update their own profile

-- Trigger: auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### courses

```sql
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         JSONB NOT NULL,          -- Full course JSON (see below)
  cover_image_url TEXT,
  is_public       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
-- SELECT: public courses readable by anyone; own courses by owner
-- INSERT: authenticated users can create courses
-- UPDATE: owners can update their courses
-- DELETE: owners can delete their courses
```

### course-media (Storage Bucket)

```sql
-- Public bucket, 50 MB file size limit
-- Allowed MIME types:
--   image/png, image/jpeg, image/gif, image/svg+xml, image/webp
--   video/mp4, video/webm
--   audio/mpeg, audio/wav, audio/m4a, audio/x-m4a
--   application/pdf

-- Policies:
--   Public read (anyone can access uploaded media)
--   Authenticated upload to user-scoped folders (user_id/*)
--   Owner delete (users can delete their own files)
```

---

## 2. Course JSON Structure

The `content` column in the `courses` table stores the full course as JSON. This is the authoritative schema:

### Course (Root)

```typescript
interface Course {
  schemaVersion: 1;          // REQUIRED — always 1
  title: string;
  lessons: Lesson[];         // Ordered array
}
```

### Lesson (Discriminated Union)

```typescript
// Content Lesson — contains blocks
interface ContentLesson {
  kind: "content";
  id: string;                // Auto-generated UUID
  title: string;
  blocks: Block[];           // Ordered array of typed blocks
}

// Assessment Lesson — contains questions
interface AssessmentLesson {
  kind: "assessment";
  id: string;                // Auto-generated UUID
  title: string;
  questions: AssessmentQuestion[];
  config: {
    passingScore: number;    // 0–100
    examSize: number;        // Questions per attempt
  };
}

type Lesson = ContentLesson | AssessmentLesson;
```

### Block Types (29 total)

#### Text Blocks

| Type | Fields | Notes |
|------|--------|-------|
| `heading` | `text: string` | Plain text or HTML |
| `text` | `text: string` | Rich HTML content |
| `list` | `style: "bulleted" \| "numbered"`, `items: string[]` | Each item is HTML |
| `quote` | `text: string`, `cite?: string` | Block quotation |
| `callout` | `variant: "info" \| "success" \| "warning" \| "danger"`, `title?: string`, `text: string` | `text` must be HTML |
| `divider` | *(no fields)* | Horizontal rule |
| `toc` | *(no fields)* | Auto-generated table of contents |

#### Media Blocks

| Type | Fields | Notes |
|------|--------|-------|
| `image` | `src: string`, `alt: string` | URL to image |
| `video` | `url: string` | YouTube, Vimeo, or direct mp4 |
| `audio` | `src: string`, `title?: string` | MIME: `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/m4a`, `audio/x-m4a` (never `audio/mp3`) |
| `document` | `src: string`, `fileType: "pdf" \| "docx" \| "xlsx" \| "pptx"`, `title?: string` | Field is `src` not `url` |
| `code` | `language: string`, `code: string` | Syntax highlighted |
| `chart` | `chartType: "bar" \| "line" \| "pie"`, `title?: string`, `labels: string[]`, `datasets: Dataset[]` | Recharts-rendered |
| `embed` | `url: string`, `title: string`, `height: number` | iframe embed |

#### Interactive Blocks

| Type | Fields | Notes |
|------|--------|-------|
| `accordion` | `items: { id, title, content }[]` | IDs auto-generated |
| `tabs` | `items: { id, label, content }[]` | IDs auto-generated |
| `timeline` | `items: { id, date, title, description? }[]` | IDs auto-generated |
| `process` | `steps: { id, title, description? }[]` | IDs auto-generated |
| `hotspot` | `src, alt, hotspots: { id, x, y, label, description? }[]` | `x`, `y` are percentages (0–100) |
| `branching` | `prompt, choices: { id, label, content }[]` | Choose-your-own-adventure |
| `flashcard` | `front, back, hint?` | Flip card |
| `button` | `label, url, variant: "primary" \| "secondary" \| "outline"`, `openInNewTab: boolean` | CTA button |

#### Knowledge Blocks (in-lesson quizzes)

| Type | Fields | Notes |
|------|--------|-------|
| `quiz` | `question, options: string[], correctIndex: number`, `showFeedback?, feedbackMessage?` | `correctIndex` is 0-based; factory default is `-1` (must set before publish) |
| `truefalse` | `question, correct: boolean`, `feedbackCorrect?, feedbackIncorrect?` | Binary answer |
| `shortanswer` | `question, answer, acceptable[]?, caseSensitive?, trimWhitespace?, showFeedback?` | Free text with accepted answers |
| `multipleresponse` | `question, options: string[], correctIndices: number[]`, `showFeedback?` | Multiple correct answers |
| `fillinblank` | `template: string, blanks: { id, acceptable[], caseSensitive? }[]` | Template uses `{{n}}` gap markers; blank IDs auto-injected |
| `matching` | `prompt, left: string[], right: string[], pairs: { leftId, rightId }[]` | MCP accepts `leftIndex`/`rightIndex`; IDs injected server-side |
| `sorting` | `prompt, buckets: string[], items: { id, text, bucketId }[]`, `showFeedback` | Categorization exercise |

### Assessment Question Types (5 kinds)

Used in `AssessmentLesson.questions[]`:

```typescript
// Discriminated union — always check `kind` before accessing fields
type AssessmentQuestion =
  | MCQQuestion
  | MultipleResponseQuestion
  | FillInBlankQuestion
  | MatchingQuestion
  | SortingQuestion;
```

| Kind | Key Fields | Notes |
|------|-----------|-------|
| `mcq` | `text, options: [4 strings], correctIndex: 0–3`, `bloomLevel?, feedback?, source?` | Single correct answer |
| `multipleresponse` | `text, options[], correctIndices[]` | Multiple correct |
| `fillinblank` | `text, blanks: { acceptable[], caseSensitive? }[]` | Gap fill |
| `matching` | `text, left[], right[], pairs: { leftIndex, rightIndex }[]` | Pair matching |
| `sorting` | `text, buckets[], items: { text, bucketId }[]` | Categorization |

---

## 3. Zod Validation

Two schema levels exist in `src/types/course.ts`:

| Schema | Purpose | Strictness |
|--------|---------|-----------|
| `courseSchema` | Editor validation — enforces all required fields | Strict |
| `courseSchemaPermissive` | Viewer validation — allows partial/legacy data | Permissive |

**Critical rule**: When adding a new block type, update **BOTH** schemas. A stale `courseSchemaPermissive` causes the viewer to silently show "Course not found".

---

## 4. ID Generation Rules

- **Course IDs**: UUID, generated by Supabase
- **Lesson IDs**: UUID, auto-generated when creating a lesson (never provide in MCP input)
- **Block IDs**: UUID, auto-generated when creating a block (never provide in MCP input)
- **Sub-item IDs** (accordion items, timeline entries, hotspot points, etc.): Auto-injected by `injectSubItemIds` in `mcp/src/tools/semantic.ts`
- **Fill-in-blank blank IDs**: Auto-injected from `{{n}}` template markers
- **Matching pair IDs**: Converted from `leftIndex`/`rightIndex` to `leftId`/`rightId` server-side

**Rule**: Never include `id` fields when creating blocks or lessons via MCP — they are always auto-generated.
