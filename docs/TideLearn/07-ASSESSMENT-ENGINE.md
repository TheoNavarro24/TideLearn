# TideLearn — Assessment Engine

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← Block System](06-BLOCK-SYSTEM.md) | [Index](00-INDEX.md) | Next: [MCP Server →](08-MCP-SERVER.md)*

---

## Overview

TideLearn supports two types of knowledge-checking:

1. **In-lesson knowledge blocks** — Quiz, TrueFalse, ShortAnswer, etc. blocks embedded within content lessons for formative assessment.
2. **Assessment lessons** — Dedicated quiz lessons with the Leitner spaced repetition algorithm for summative assessment.

---

## Assessment Lessons

Assessment lessons use `kind: "assessment"` in the discriminated union. They do NOT contain blocks — they contain questions.

### Configuration

```typescript
interface AssessmentConfig {
  passingScore: number;   // 0–100 (percentage)
  examSize: number;       // Number of questions per attempt
}
```

### Question Types (5 kinds)

Assessment questions are a **discriminated union** — always check `kind` before accessing type-specific fields.

#### MCQ (Multiple Choice Question)

```typescript
interface MCQQuestion {
  kind: "mcq";
  id: string;                      // Auto-generated
  text: string;                    // Question text (HTML)
  options: [string, string, string, string];  // Exactly 4 options
  correctIndex: number;            // 0–3 (0-based)
  bloomLevel?: string;             // Bloom's taxonomy level
  feedback?: string;               // Explanation shown after answer
  source?: string;                 // Content reference
}
```

#### Multiple Response

```typescript
interface MultipleResponseQuestion {
  kind: "multipleresponse";
  id: string;
  text: string;
  options: string[];               // Variable number of options
  correctIndices: number[];        // All correct option indices (0-based)
}
```

#### Fill-in-the-Blank

```typescript
interface FillInBlankQuestion {
  kind: "fillinblank";
  id: string;
  text: string;                    // Template text with gaps
  blanks: {
    acceptable: string[];          // Accepted answers for this blank
    caseSensitive?: boolean;       // Default: false
  }[];
}
```

#### Matching

```typescript
interface MatchingQuestion {
  kind: "matching";
  id: string;
  text: string;                    // Instructions
  left: string[];                  // Left column items
  right: string[];                 // Right column items
  pairs: {
    leftIndex: number;             // Index into left[]
    rightIndex: number;            // Index into right[]
  }[];
}
```

#### Sorting

```typescript
interface SortingQuestion {
  kind: "sorting";
  id: string;
  text: string;                    // Instructions
  buckets: string[];               // Category names
  items: {
    text: string;                  // Item to sort
    bucketId: string;              // Correct bucket
  }[];
}
```

---

## Leitner Spaced Repetition Algorithm

File: `src/lib/assessment.ts`

The Leitner system classifies questions into boxes based on mastery:

```
Box 1 (New/Wrong)  →  Box 2 (Learning)  →  Box 3 (Reviewing)  →  Box 4 (Mastered)
     ↑                                                                    |
     └────────────────── Wrong answer ←──────────────────────────────────┘
```

### How It Works

1. **New questions** start in Box 1
2. **Correct answer** → question moves to the next box
3. **Wrong answer** → question moves back to Box 1
4. **Question selection** prioritizes lower boxes (more practice for harder questions)
5. **Exam size** limits how many questions appear per attempt (configurable)
6. **Passing score** determines if the learner passes the assessment

### Progress Tracking

Progress is tracked in `src/lib/progress.ts`:

- Per-lesson progress (percentage of blocks viewed / questions answered)
- Assessment scores and attempt history
- Leitner box assignments per question

---

## MCP Operations for Assessments

### Creating an Assessment Lesson

Use `add_assessment_lesson` — NOT `add_lesson`. Block operations (add_block, move_block, etc.) will error on assessment lessons.

### Managing Questions

| Tool | Purpose |
|------|---------|
| `add_question` | Add a question to an assessment lesson (specify `kind`) |
| `update_question` | Update a question's fields |
| `delete_question` | Remove a question |
| `replace_questions` | Replace all questions at once |
| `update_assessment_config` | Change passing score or exam size |

### Important Rules

- `correctIndex` is **0-based** — factory default is `-1` (must set before publish)
- Assessment lessons support only these 5 question kinds: `mcq`, `multipleresponse`, `fillinblank`, `matching`, `sorting`
- `shortanswer` is a block type only — NOT available as an assessment question
- Always check the `kind` field before accessing type-specific properties
- Question IDs are auto-generated — never provide them in MCP input

---

## In-Lesson Knowledge Blocks vs. Assessment Questions

| Feature | Knowledge Blocks | Assessment Questions |
|---------|-----------------|---------------------|
| Location | Inside content lessons | Inside assessment lessons |
| Purpose | Formative (practice) | Summative (graded) |
| Spaced repetition | No | Yes (Leitner) |
| Scoring | Instant feedback | Tracked, aggregated |
| Types available | quiz, truefalse, shortanswer, multipleresponse, fillinblank, matching, sorting | mcq, multipleresponse, fillinblank, matching, sorting |
| MCP tools | `add_block` | `add_question` |
