# 03 — Data Model and Flow Contracts

## Course schema (must stay compatible)
Top-level:
```ts
Course = {
  schemaVersion: 1,
  title: string,
  lessons: Lesson[]
}
```

Lesson:
```ts
Lesson = {
  id: string,
  title: string,
  blocks: Block[]
}
```

`Block` is a discriminated union on `type` (heading, text, image, quiz, code, list, quote, accordion, tabs, divider, toc, callout, video, audio, truefalse, shortanswer).

## Storage contracts
- Index list: `localStorage['courses:index']` -> array of `{ id, title, updatedAt }`.
- Course payload: `localStorage['course:<id>']` -> serialized `Course`.
- Legacy draft key: `localStorage['editor:course']`.
- Player progress/answers are keyed by hash-based identifiers, e.g.:
  - `quizAnswers:<hash>`
  - `courseProgress:<hash>`

## URL contracts
- View/share: `/view#<lz-string-compressed-course-json>`
- Editor deep-link intents in hash params use version gate `v=1`, with intents such as:
  - `intent=create&course=<compressed>`
  - `intent=patch&ops=<compressed>`

## Backend API contracts currently in code
- `/functions/v1/compress` expects POST body with `{ course, origin }`, returns `{ shareUrl, hash }`.
- `/functions/v1/links` expects POST body with `{ payloadType, payload, origin }`, returns `{ url }` and stores payload in Deno KV.

## Interop notes for Claude
- Preserve hash payload codec (`compressToEncodedURIComponent` / `decompressFromEncodedURIComponent`).
- Keep `schemaVersion` literal at `1` unless coordinated migration is added.
- Keep block `type` strings stable, as they drive rendering and validation.
