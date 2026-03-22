# MCP Auth Fix & Stress Test Suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the MCP's embedded login page with a redirect to the real app's auth page (enabling Google OAuth), then add ≥120 Vitest tests and a 10-scenario agentic playbook covering all 33 MCP tools.

**Architecture:** The MCP starts a local callback-only HTTP server; `tidelearn_login` returns a URL pointing at the real app's `/auth` page with the callback URL as a query param. The app saves the callback to `sessionStorage` (survives OAuth navigation), then redirects back with tokens after sign-in. Vitest tests mock Supabase; the agentic playbook runs against a real Supabase instance using the agent Google account.

**Tech Stack:** TypeScript, Node.js `http` module, Vitest, React, Supabase JS client, MCP SDK

**Spec:** `docs/superpowers/specs/2026-03-22-mcp-auth-fix-and-stress-tests-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mcp/src/tools/auth.ts` | Modify | Remove LOGIN_PAGE + POST /login handler; replace with callback-only GET /callback server |
| `src/pages/Auth.tsx` | Modify | Save mcp_callback to sessionStorage on mount; redirect to callback after sign-in (email/password + Google paths + already-authenticated) |
| `mcp/tests/fixtures/blocks.ts` | Create | Shared fixtures: ALL_BLOCKS (17 types) + SAMPLE_QUESTIONS |
| `mcp/tests/schema.test.ts` | Modify | Add 17 valid-block tests + 9 invalid-block tests |
| `mcp/tests/inject.test.ts` | Modify | Add 8 edge-case tests |
| `mcp/tests/validate.test.ts` | Create | 14 tests: valid courses, invalid schema errors |
| `mcp/tests/preview.test.ts` | Modify | Add 17 block-render tests + 5 assessment tests + 8 gap-matrix tests |
| `mcp/tests/mutate.test.ts` | Modify | Add 5 error-path tests |
| `mcp/tests/tool-mocks.test.ts` | Create | 25 mock-Supabase tool tests |
| `docs/testing/mcp-stress-playbook.md` | Create | Numbered scenarios for agentic execution |

---

## Task 1: MCP callback server

**Files:**
- Modify: `mcp/src/tools/auth.ts`

**Context:** The current `startLoginServer()` serves an embedded HTML login form and handles `POST /login` by calling Supabase directly. We're replacing this entirely. The new server only handles `GET /callback?access_token=...&refresh_token=...&expires_at=...`, saves the session, and closes. The MCP tool returns a URL pointing at the real app rather than localhost.

- [ ] **Step 1: Read the current file**

  Open `mcp/src/tools/auth.ts`. Note the structure: `LOGIN_PAGE` constant (lines 7–76), `SUCCESS_PAGE` constant (lines 78–106), `startLoginServer()` function (lines 109–166), and `registerAuthTools()` (lines 168–194).

- [ ] **Step 2: Replace the file content**

  Replace the full contents of `mcp/src/tools/auth.ts` with:

  ```typescript
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { createServer } from "http";
  import { saveSession, clearSession } from "../lib/auth.js";
  import { APP_URL, ok, err } from "../lib/supabase.js";

  const LOGGED_IN_PAGE = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>TideLearn — Logged in</title>
    <style>
      body { font-family: system-ui, sans-serif; display: flex; align-items: center;
             justify-content: center; min-height: 100vh; background: #071612; margin: 0; }
      .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
              border-radius: 16px; padding: 2.5rem 2rem; text-align: center; max-width: 340px; color: #fff; }
      .icon { font-size: 2.5rem; margin-bottom: 1rem; }
      h1 { font-size: 1.3rem; font-weight: 600; margin-bottom: 0.5rem; }
      p { color: rgba(148,210,204,0.6); font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✓</div>
      <h1>Logged in successfully</h1>
      <p>You can close this tab and return to Claude.</p>
    </div>
  </body>
  </html>`;

  /** Start a short-lived local HTTP server that only handles the /callback route. */
  function startCallbackServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = createServer(async (req, res) => {
        const url = new URL(req.url ?? "/", "http://localhost");

        if (req.method === "GET" && url.pathname === "/callback") {
          const access_token = url.searchParams.get("access_token") ?? "";
          const refresh_token = url.searchParams.get("refresh_token") ?? "";
          const expires_at =
            Number(url.searchParams.get("expires_at") ?? "0") ||
            Math.floor(Date.now() / 1000) + 3600;

          try {
            await saveSession({ access_token, refresh_token, expires_at });
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(LOGGED_IN_PAGE);
            server.close();
          } catch (e: any) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Failed to save session: " + (e.message ?? "unknown error"));
          }
          return;
        }

        res.writeHead(404);
        res.end();
      });

      // Auto-close after 10 minutes if user never completes login
      const timeout = setTimeout(() => server.close(), 10 * 60 * 1000);
      server.on("close", () => clearTimeout(timeout));

      server.listen(0, "127.0.0.1", () => {
        const port = (server.address() as any).port;
        const callbackUrl = `http://localhost:${port}/callback`;
        resolve(`${APP_URL}/auth?mcp_callback=${encodeURIComponent(callbackUrl)}`);
      });

      server.on("error", reject);
    });
  }

  export function registerAuthTools(server: McpServer) {
    server.tool(
      "tidelearn_login",
      "Open a browser login page for TideLearn. Returns a URL — give it to the user to click. Supports email/password and Google. No credentials needed in chat. After the user confirms they have signed in, read the tidelearn://instructions resource before using any other tools — it contains the full block schema, tool reference, and critical rules.",
      {},
      async () => {
        try {
          const loginUrl = await startCallbackServer();
          return ok({
            message: `Open this URL in your browser to sign in:\n\n${loginUrl}\n\nYou can use email/password or your Google account. Once you've signed in, close the tab and tell me, then read the tidelearn://instructions resource for the full block schema and tool reference.`,
            url: loginUrl,
          });
        } catch (e: any) {
          return err("server_error", e.message ?? "Failed to start login server");
        }
      }
    );

    server.tool(
      "tidelearn_logout",
      "Log out of TideLearn and clear the saved session.",
      {},
      async () => {
        await clearSession();
        return ok({ message: "Logged out successfully." });
      }
    );
  }
  ```

- [ ] **Step 3: Build the MCP and verify no compile errors**

  ```bash
  cd mcp && npm run build 2>&1 | tail -20
  ```

  Expected: no TypeScript errors.

- [ ] **Step 4: Run existing tests**

  ```bash
  cd mcp && npm test 2>&1 | tail -20
  ```

  Expected: all existing tests pass. Test count should stay at ~48.

- [ ] **Step 5: Commit**

  ```bash
  git add mcp/src/tools/auth.ts
  git commit -m "feat(mcp): replace embedded login page with real app auth redirect"
  ```

---

## Task 2: App auth page — sessionStorage + callback redirect

**Files:**
- Modify: `src/pages/Auth.tsx`

**Context:** Four changes to Auth.tsx, all working together:

1. **On mount** — save `?mcp_callback` query param to `sessionStorage["mcp_callback"]`
2. **Already-authenticated redirect** — before sending user to `"/"`, check sessionStorage; if mcp_callback exists, redirect to it with current session tokens
3. **Email/password success** — before `window.location.href = "/"`, check sessionStorage same way
4. **Google OAuth `redirectTo`** — change from `window.location.origin` to `${window.location.origin}/auth` so the user lands back on Auth.tsx after OAuth, where the already-authenticated check catches them

There are no Vitest tests for React components in this project. Correctness is verified by the agentic playbook (Scenario 1) in Task 11.

- [ ] **Step 1: Add a helper function above the component**

  After the imports (before `export default function Auth()`), add this helper:

  ```tsx
  /** Redirect to the MCP callback URL with session tokens. */
  async function redirectToMcpCallback(cb: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    sessionStorage.removeItem("mcp_callback");
    const url = new URL(cb);
    url.searchParams.set("access_token", session.access_token);
    url.searchParams.set("refresh_token", session.refresh_token);
    url.searchParams.set("expires_at", String(session.expires_at ?? Math.floor(Date.now() / 1000) + 3600));
    window.location.href = url.toString();
  }
  ```

- [ ] **Step 2: Add mcp_callback save on mount**

  Inside the `Auth` component, after the existing state declarations (after `const navigate = useNavigate();`, which is around line 15), add a new `useEffect`:

  ```tsx
  // Save mcp_callback to sessionStorage on mount (survives OAuth page navigation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cb = params.get("mcp_callback");
    if (cb) {
      sessionStorage.setItem("mcp_callback", cb);
    }
  }, []);
  ```

- [ ] **Step 3: Modify the already-authenticated redirect effect**

  Find the existing `useEffect` (lines 18–22):

  ```tsx
  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);
  ```

  Replace it with:

  ```tsx
  // Redirect if already authenticated — check for MCP callback first
  useEffect(() => {
    if (!authLoading && user) {
      const cb = sessionStorage.getItem("mcp_callback");
      if (cb) {
        redirectToMcpCallback(cb);
      } else {
        navigate("/");
      }
    }
  }, [user, authLoading, navigate]);
  ```

- [ ] **Step 4: Modify the email/password success branch**

  Find the sign-in success block (around line 77–80):

  ```tsx
  if (data.user) {
    // Force page reload for clean state
    window.location.href = "/";
  }
  ```

  Replace it with:

  ```tsx
  if (data.user) {
    const cb = sessionStorage.getItem("mcp_callback");
    if (cb) {
      await redirectToMcpCallback(cb);
      return;
    }
    // Force page reload for clean state
    window.location.href = "/";
  }
  ```

- [ ] **Step 5: Change Google OAuth redirectTo to `/auth`**

  Find `handleGoogleAuth` (around line 98–103):

  ```tsx
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
  ```

  Change `redirectTo` to:

  ```tsx
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth`,
    },
  });
  ```

  **Why:** After Google OAuth, the browser lands back at `/auth` (not `/`). Auth.tsx is mounted; by the time it renders, `AuthContext` has already resolved the session (Supabase fires `onAuthStateChange` before the React tree re-renders with the new user), so `user` is set and `authLoading` is false on the first render cycle. The already-authenticated `useEffect` fires, finds `sessionStorage["mcp_callback"]` if present, and redirects to the callback. For non-MCP users, the same check runs normally and sends them to `"/"`. This approach is simpler than adding a separate `onAuthStateChange` listener inside `Auth.tsx` because `AuthContext` already owns that subscription — duplicating it risks double-firing on re-mount.

- [ ] **Step 6: Build the app and verify no TypeScript errors**

  ```bash
  npm run build 2>&1 | grep -E "error|Error" | head -20
  ```

  Expected: no errors.

- [ ] **Step 7: Commit**

  ```bash
  git add src/pages/Auth.tsx
  git commit -m "feat(auth): support MCP callback redirect via sessionStorage"
  ```

---

## Task 3: Shared test fixtures

**Files:**
- Create: `mcp/tests/fixtures/blocks.ts`

**Context:** All block-related tests import from this file so fixture data is defined once. Matches the `factories` output in `mcp/src/lib/types.ts`.

- [ ] **Step 1: Create the fixtures directory and file**

  ```bash
  mkdir -p mcp/tests/fixtures
  ```

  Create `mcp/tests/fixtures/blocks.ts`:

  ```typescript
  import type { Block, AssessmentQuestion } from "../../src/lib/types.js";

  export const ALL_BLOCKS: Block[] = [
    { id: "b-heading",     type: "heading",     text: "Test Heading" },
    { id: "b-text",        type: "text",        text: "<p>Test paragraph</p>" },
    { id: "b-image",       type: "image",       src: "https://picsum.photos/800/400", alt: "Test image" },
    { id: "b-video",       type: "video",       url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { id: "b-audio",       type: "audio",       src: "https://www.w3schools.com/html/horse.mp3", title: "Audio clip" },
    { id: "b-document",    type: "document",    src: "https://www.w3.org/WAI/WCAG21/wcag21.pdf", fileType: "pdf", title: "WCAG 2.1" },
    { id: "b-quiz",        type: "quiz",        question: "What is 2+2?", options: ["3", "4", "5", "6"], correctIndex: 1 },
    { id: "b-truefalse",   type: "truefalse",   question: "The sky is blue.", correct: true, showFeedback: true, feedbackCorrect: "Yes!", feedbackIncorrect: "No!" },
    { id: "b-shortanswer", type: "shortanswer", question: "Capital of France?", answer: "Paris", acceptable: ["paris"], caseSensitive: false, trimWhitespace: true },
    { id: "b-list",        type: "list",        style: "bulleted", items: ["Alpha", "Beta", "Gamma"] },
    { id: "b-callout",     type: "callout",     variant: "warning", title: "Note", text: "<p>Pay attention.</p>" },
    { id: "b-accordion",   type: "accordion",   items: [{ id: "a1", title: "Q1", content: "Answer 1" }, { id: "a2", title: "Q2", content: "Answer 2" }] },
    { id: "b-tabs",        type: "tabs",        items: [{ id: "t1", label: "Tab A", content: "Content A" }, { id: "t2", label: "Tab B", content: "Content B" }] },
    { id: "b-quote",       type: "quote",       text: "To be or not to be.", cite: "Shakespeare" },
    { id: "b-code",        type: "code",        language: "typescript", code: "const x = 42;" },
    { id: "b-divider",     type: "divider" },
    { id: "b-toc",         type: "toc" },
  ];

  export const SAMPLE_QUESTIONS: AssessmentQuestion[] = [
    {
      id: "q1",
      text: "What does PASS stand for?",
      options: ["Pull Aim Squeeze Sweep", "Press Activate Spray Stop", "Point Aim Shoot Spray", "Push Aim Spray Sweep"],
      correctIndex: 0,
      bloomLevel: "K",
      source: "Module 1",
      feedback: "PASS is the acronym for the fire extinguisher technique.",
    },
    {
      id: "q2",
      text: "When should you evacuate?",
      options: ["Never", "Only if told by a manager", "Immediately on alarm", "After finishing current task"],
      correctIndex: 2,
      bloomLevel: "AP",
      source: "Module 2",
    },
  ];
  ```

- [ ] **Step 2: Verify the fixtures file compiles**

  ```bash
  cd mcp && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add mcp/tests/fixtures/
  git commit -m "test: add shared block and question fixtures"
  ```

---

## Task 4: Extend schema.test.ts

**Files:**
- Modify: `mcp/tests/schema.test.ts`

**Context:** Current file has 10 tests (document validity, feedback fields, injectSubItemIds). Adding coverage for all 17 block types (valid parse) and 9 invalid cases. Skip any new test that would be identical to an existing assertion.

- [ ] **Step 1: Add the fixtures import at the top of the file**

  Open `mcp/tests/schema.test.ts`. Add this import after the existing import lines (alongside `import { blockSchema } from "../src/lib/types.js"`):

  ```typescript
  import { ALL_BLOCKS } from "./fixtures/blocks.js";
  ```

- [ ] **Step 2: Append the new test blocks at the end of the file**

  ```typescript
  describe("blockSchema — all 17 block types", () => {
    ALL_BLOCKS.forEach((block) => {
      it(`accepts valid ${block.type} block`, () => {
        const result = blockSchema.safeParse(block);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("blockSchema — invalid cases", () => {
    it("rejects quiz with string correctIndex", () => {
      expect(blockSchema.safeParse({ id: "q1", type: "quiz", question: "Q?", options: ["A","B","C","D"], correctIndex: "1" }).success).toBe(false);
    });
    it("rejects truefalse with string correct", () => {
      expect(blockSchema.safeParse({ id: "tf1", type: "truefalse", question: "Q?", correct: "true" }).success).toBe(false);
    });
    it("rejects accordion item missing title", () => {
      expect(blockSchema.safeParse({ id: "a1", type: "accordion", items: [{ id: "i1", content: "C" }] }).success).toBe(false);
    });
    it("rejects tabs item missing label", () => {
      expect(blockSchema.safeParse({ id: "t1", type: "tabs", items: [{ id: "i1", content: "C" }] }).success).toBe(false);
    });
    it("rejects image missing alt", () => {
      expect(blockSchema.safeParse({ id: "i1", type: "image", src: "https://example.com/img.jpg" }).success).toBe(false);
    });
    it("rejects callout with invalid variant", () => {
      expect(blockSchema.safeParse({ id: "c1", type: "callout", variant: "purple", text: "Hey" }).success).toBe(false);
    });
    it("rejects list with invalid style", () => {
      expect(blockSchema.safeParse({ id: "l1", type: "list", style: "ordered", items: ["A"] }).success).toBe(false);
    });
    it("rejects code block missing language", () => {
      expect(blockSchema.safeParse({ id: "c1", type: "code", code: "const x = 1" }).success).toBe(false);
    });
    it("rejects unknown block type", () => {
      expect(blockSchema.safeParse({ id: "x1", type: "banner", text: "Hello" }).success).toBe(false);
    });
  });
  ```

  Note: the existing test already covers `document` with invalid fileType (`"xyz"`). The new `callout` variant test and the `list` style test are genuinely new.

- [ ] **Step 3: Run tests — all should pass**

  ```bash
  cd mcp && npm test 2>&1 | tail -10
  ```

  Expected: all pass. Test count grows by ~26.

- [ ] **Step 4: Commit**

  ```bash
  git add mcp/tests/schema.test.ts
  git commit -m "test: extend schema tests to cover all 17 block types and invalid cases"
  ```

---

## Task 5: Extend inject.test.ts

**Files:**
- Modify: `mcp/tests/inject.test.ts`

**Context:** Current file has 10 tests covering `injectIds` (7 tests) and `injectLessonIds` (3 tests). Adding 8 edge-case tests.

- [ ] **Step 1: Write the failing tests**

  Append to `mcp/tests/inject.test.ts`:

  ```typescript
  describe("injectIds — edge cases", () => {
    it("handles course with only assessment lessons (no kind:content injected)", () => {
      const course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "assessment",
          title: "Exam",
          questions: [{ text: "Q1", options: ["A","B","C","D"], correctIndex: 0 }],
          config: {},
        }],
      };
      const result = injectIds(course);
      expect(result.lessons[0].kind).toBe("assessment");
    });

    it("handles course with only content lessons (all get kind:content)", () => {
      const course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [
          { title: "L1", blocks: [] },
          { title: "L2", blocks: [] },
        ],
      };
      const result = injectIds(course);
      expect(result.lessons.every((l: any) => l.kind === "content")).toBe(true);
    });

    it("handles mixed course: content and assessment lessons independently", () => {
      const course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [
          { title: "Content", blocks: [] },
          { kind: "assessment", title: "Exam", questions: [], config: {} },
        ],
      };
      const result = injectIds(course);
      expect(result.lessons[0].kind).toBe("content");
      expect(result.lessons[1].kind).toBe("assessment");
    });

    it("preserves existing lesson id", () => {
      const course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{ id: "pre-existing", title: "L1", blocks: [] }],
      };
      const result = injectIds(course);
      expect(result.lessons[0].id).toBe("pre-existing");
    });

    it("preserves existing question id", () => {
      const course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "assessment",
          title: "Exam",
          questions: [{ id: "q-pre", text: "Q1", options: ["A","B","C","D"], correctIndex: 0 }],
          config: {},
        }],
      };
      const result = injectIds(course);
      expect(result.lessons[0].questions[0].id).toBe("q-pre");
    });

    it("handles empty blocks array without crash", () => {
      const course = { schemaVersion: 1, title: "Test", lessons: [{ title: "L1", blocks: [] }] };
      expect(() => injectIds(course)).not.toThrow();
    });

    it("handles empty questions array without crash", () => {
      const course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{ kind: "assessment", title: "Exam", questions: [], config: {} }],
      };
      expect(() => injectIds(course)).not.toThrow();
    });

    it("content lesson with accordion AND tabs: both get sub-item ids", () => {
      const course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          title: "L1",
          blocks: [
            { type: "accordion", items: [{ title: "S1", content: "C1" }] },
            { type: "tabs", items: [{ label: "T1", content: "C1" }] },
          ],
        }],
      };
      const result = injectIds(course);
      expect(typeof result.lessons[0].blocks[0].items[0].id).toBe("string");
      expect(typeof result.lessons[0].blocks[1].items[0].id).toBe("string");
    });
  });
  ```

- [ ] **Step 2: Run tests — all should pass**

  ```bash
  cd mcp && npm test 2>&1 | tail -10
  ```

  Expected: all pass.

- [ ] **Step 3: Commit**

  ```bash
  git add mcp/tests/inject.test.ts
  git commit -m "test: extend inject tests with edge cases"
  ```

---

## Task 6: Create validate.test.ts

**Files:**
- Create: `mcp/tests/validate.test.ts`

**Context:** `validate.ts` exports `validateCourseJson()` which calls `courseSchema.safeParse()`. No test file currently exists. Creating 14 tests covering valid courses and invalid schema errors.

- [ ] **Step 1: Write the failing test file**

  Create `mcp/tests/validate.test.ts`:

  ```typescript
  import { describe, it, expect } from "vitest";
  import { validateCourseJson } from "../src/lib/validate.js";
  import { ALL_BLOCKS } from "./fixtures/blocks.js";

  describe("validateCourseJson — valid courses", () => {
    it("accepts course with all 17 block types", () => {
      const result = validateCourseJson({
        schemaVersion: 1,
        title: "All Blocks",
        lessons: [{ kind: "content", id: "l1", title: "L1", blocks: ALL_BLOCKS }],
      });
      expect(result.ok).toBe(true);
    });

    it("accepts course with only an assessment lesson", () => {
      const result = validateCourseJson({
        schemaVersion: 1,
        title: "Assessment Only",
        lessons: [{
          kind: "assessment",
          id: "l1",
          title: "Final Exam",
          questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0 }],
          config: { passingScore: 80, examSize: 10 },
        }],
      });
      expect(result.ok).toBe(true);
    });

    it("accepts course with 0 lessons", () => {
      const result = validateCourseJson({ schemaVersion: 1, title: "Empty", lessons: [] });
      expect(result.ok).toBe(true);
    });
  });

  describe("validateCourseJson — invalid cases", () => {
    it("rejects missing schemaVersion", () => {
      const result = validateCourseJson({ title: "No Version", lessons: [] });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.some(e => e.includes("schemaVersion"))).toBe(true);
    });

    it("rejects schemaVersion: 2", () => {
      const result = validateCourseJson({ schemaVersion: 2, title: "Wrong Version", lessons: [] });
      expect(result.ok).toBe(false);
    });

    it("rejects lesson missing kind", () => {
      const result = validateCourseJson({
        schemaVersion: 1,
        title: "Test",
        lessons: [{ id: "l1", title: "No Kind", blocks: [] }],
      });
      expect(result.ok).toBe(false);
    });

    it("rejects assessment lesson with 3-option question (tuple requires exactly 4)", () => {
      const result = validateCourseJson({
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "assessment",
          id: "l1",
          title: "Exam",
          questions: [{ id: "q1", text: "Q?", options: ["A","B","C"], correctIndex: 0 }],
          config: {},
        }],
      });
      expect(result.ok).toBe(false);
    });

    it("rejects assessment question with correctIndex: 5 (max 3)", () => {
      const result = validateCourseJson({
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "assessment",
          id: "l1",
          title: "Exam",
          questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 5 }],
          config: {},
        }],
      });
      expect(result.ok).toBe(false);
    });

    it("rejects course missing title", () => {
      const result = validateCourseJson({ schemaVersion: 1, lessons: [] });
      expect(result.ok).toBe(false);
    });

    it("rejects lessons not being an array", () => {
      const result = validateCourseJson({ schemaVersion: 1, title: "T", lessons: "not-an-array" });
      expect(result.ok).toBe(false);
    });

    it("returns errors as array of readable strings", () => {
      const result = validateCourseJson({ title: "No Version", lessons: [] });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(Array.isArray(result.errors)).toBe(true);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(typeof result.errors[0]).toBe("string");
      }
    });
  });

  describe("validateCourseJson — passthrough behaviour", () => {
    it("content lesson with extra fields (passthrough schema) passes", () => {
      const result = validateCourseJson({
        schemaVersion: 1,
        title: "Test",
        lessons: [{ kind: "content", id: "l1", title: "L1", blocks: [], extraField: true }],
      });
      expect(result.ok).toBe(true);
    });

    it("assessment question with extra fields (passthrough schema) passes", () => {
      const result = validateCourseJson({
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "assessment",
          id: "l1",
          title: "Exam",
          questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0, bloomLevel: "K", source: "M1" }],
          config: { passingScore: 75 },
        }],
      });
      expect(result.ok).toBe(true);
    });

    it("returns course object typed correctly on success", () => {
      const result = validateCourseJson({ schemaVersion: 1, title: "T", lessons: [] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.course.schemaVersion).toBe(1);
        expect(result.course.title).toBe("T");
      }
    });
  });
  ```

- [ ] **Step 2: Run to verify they pass**

  ```bash
  cd mcp && npm test 2>&1 | tail -10
  ```

  Expected: all pass.

- [ ] **Step 3: Commit**

  ```bash
  git add mcp/tests/validate.test.ts
  git commit -m "test: add validate.test.ts with 14 tests for validateCourseJson"
  ```

---

## Task 7: Extend preview.test.ts

**Files:**
- Modify: `mcp/tests/preview.test.ts`

**Context:** Current file has 12 tests. Adding ~30 more: one per block type for rendering, 5 assessment rendering cases, and 8 gap matrix cases.

- [ ] **Step 1: Add import and block-type render tests**

  At the top of `mcp/tests/preview.test.ts`, add the import:

  ```typescript
  import { ALL_BLOCKS, SAMPLE_QUESTIONS } from "./fixtures/blocks.js";
  ```

  Append to the file:

  ```typescript
  describe("renderCourseToHtml — all 17 block types", () => {
    ALL_BLOCKS.forEach((block) => {
      it(`renders ${block.type} block without [Unknown block type]`, () => {
        const course: Course = {
          schemaVersion: 1,
          title: "Test",
          lessons: [{ kind: "content", id: "l1", title: "L1", blocks: [block] }],
        };
        const html = renderCourseToHtml(course);
        expect(typeof html).toBe("string");
        expect(html.length).toBeGreaterThan(0);
        expect(html).not.toContain("[Unknown block type]");
      });
    });
  });

  describe("renderCourseToHtml — assessment lesson rendering", () => {
    it("shows 'No questions in bank yet' when question bank is empty", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{ kind: "assessment", id: "l1", title: "Empty Exam", questions: [], config: {} }],
      };
      const html = renderCourseToHtml(course);
      expect(html).toContain("No questions in bank yet");
    });

    it("renders question text and options for a single question", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{ kind: "assessment", id: "l1", title: "Exam", questions: [SAMPLE_QUESTIONS[0]], config: {} }],
      };
      const html = renderCourseToHtml(course);
      expect(html).toContain("What does PASS stand for?");
      expect(html).toContain("Pull Aim Squeeze Sweep");
      expect(html).toContain("✓");
    });

    it("renders feedback when present", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{ kind: "assessment", id: "l1", title: "Exam", questions: [SAMPLE_QUESTIONS[0]], config: {} }],
      };
      const html = renderCourseToHtml(course);
      expect(html).toContain("PASS is the acronym");
    });

    it("renders bloomLevel badge when present", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{ kind: "assessment", id: "l1", title: "Exam", questions: [SAMPLE_QUESTIONS[0]], config: {} }],
      };
      const html = renderCourseToHtml(course);
      // bloomLevel "K" should appear as a badge
      expect(html).toContain(">K<");
    });

    it("renders source badge when present", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{ kind: "assessment", id: "l1", title: "Exam", questions: [SAMPLE_QUESTIONS[0]], config: {} }],
      };
      const html = renderCourseToHtml(course);
      expect(html).toContain("Module 1");
    });
  });

  describe("analyzeCourse — gap matrix", () => {
    it("flags too_short for lesson with only a heading block", () => {
      // too_short gap is for lessons with >10 blocks — check the no_media and no_assessment gaps instead
      // A single-block lesson still gets no_assessment and no_media gaps
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{ kind: "content", id: "l1", title: "L1", blocks: [{ id: "b1", type: "heading", text: "Hi" }] }],
      };
      const result = analyzeCourse(course);
      const gapTypes = result.gaps.map(g => g.type);
      expect(gapTypes).toContain("no_media");
      expect(gapTypes).toContain("no_assessment");
    });

    it("flags no_assessment when no quiz block and no assessment lesson", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "content",
          id: "l1",
          title: "L1",
          blocks: [
            { id: "b1", type: "heading", text: "H" },
            { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
            { id: "b3", type: "text", text: "<p>text</p>" },
          ],
        }],
      };
      const result = analyzeCourse(course);
      expect(result.gaps.some(g => g.type === "no_assessment" && g.lesson_id === "l1")).toBe(true);
    });

    it("does NOT flag no_assessment when course has an assessment lesson", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [
          {
            kind: "content",
            id: "l1",
            title: "L1",
            blocks: [
              { id: "b1", type: "heading", text: "H" },
              { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
            ],
          },
          {
            kind: "assessment",
            id: "l2",
            title: "Exam",
            questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0 }],
            config: {},
          },
        ],
      };
      const result = analyzeCourse(course);
      expect(result.gaps.every(g => g.type !== "no_assessment")).toBe(true);
    });

    it("flags no_media for lesson with no image/video/audio", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "content",
          id: "l1",
          title: "L1",
          blocks: [
            { id: "b1", type: "heading", text: "H" },
            { id: "b2", type: "text", text: "<p>text</p>" },
            { id: "b3", type: "quiz", question: "Q?", options: ["A","B","C","D"], correctIndex: 0 },
          ],
        }],
      };
      const result = analyzeCourse(course);
      expect(result.gaps.some(g => g.type === "no_media")).toBe(true);
    });

    it("does NOT flag no_media for lesson with image", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "content",
          id: "l1",
          title: "L1",
          blocks: [
            { id: "b1", type: "heading", text: "H" },
            { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
            { id: "b3", type: "quiz", question: "Q?", options: ["A","B","C","D"], correctIndex: 0 },
          ],
        }],
      };
      const result = analyzeCourse(course);
      expect(result.gaps.every(g => g.type !== "no_media")).toBe(true);
    });

    it("reports multiple gaps on one lesson", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "content",
          id: "l1",
          title: "L1",
          blocks: [{ id: "b1", type: "heading", text: "H" }],
        }],
      };
      const result = analyzeCourse(course);
      const l1Gaps = result.gaps.filter(g => g.lesson_id === "l1");
      expect(l1Gaps.length).toBeGreaterThanOrEqual(2);
    });

    it("meeting all criteria produces no gaps", () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{
          kind: "content",
          id: "l1",
          title: "L1",
          blocks: [
            { id: "b1", type: "heading", text: "H" },
            { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
            { id: "b3", type: "quiz", question: "Q?", options: ["A","B","C","D"], correctIndex: 0 },
          ],
        }],
      };
      const result = analyzeCourse(course);
      expect(result.gaps).toHaveLength(0);
    });

    it("course with 0 lessons: no crash, empty gaps array", () => {
      const course: Course = { schemaVersion: 1, title: "Empty", lessons: [] };
      expect(() => analyzeCourse(course)).not.toThrow();
      const result = analyzeCourse(course);
      expect(result.gaps).toHaveLength(0);
    });
  });
  ```

- [ ] **Step 2: Run tests — all should pass**

  ```bash
  cd mcp && npm test 2>&1 | tail -10
  ```

  Expected: all pass. Note: `">K<"` in the bloomLevel test checks for the badge text — if the actual HTML is `>K<` with different surrounding context, adjust accordingly. The esc() function in preview.ts doesn't alter single-character strings so this should work.

- [ ] **Step 3: Commit**

  ```bash
  git add mcp/tests/preview.test.ts
  git commit -m "test: extend preview tests for all block types, assessment rendering, gap matrix"
  ```

---

## Task 8: Extend mutate.test.ts

**Files:**
- Modify: `mcp/tests/mutate.test.ts`

**Context:** Current file has 2 tests. Adding 5 error-path tests covering DB errors, content-null, userId mismatch, and mutation throws.

- [ ] **Step 1: Append tests**

  Append to `mcp/tests/mutate.test.ts`:

  ```typescript
  describe("mutateCourse — additional error paths", () => {
    it("returns update_failed when DB update errors", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { content: { schemaVersion: 1, title: "T", lessons: [] }, user_id: "u1" },
          error: null,
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
          }),
        }),
      } as any;

      const { mutateCourse } = await import("../src/lib/mutate.js");
      const result = await mutateCourse(mockClient, "u1", "c1", (c) => c);
      expect(result).toBe("update_failed");
    });

    it("returns course_not_found when fetch errors", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      } as any;

      const { mutateCourse } = await import("../src/lib/mutate.js");
      const result = await mutateCourse(mockClient, "u1", "bad-id", (c) => c);
      expect(result).toBe("course_not_found");
    });

    it("returns null on successful mutation", async () => {
      const course = { schemaVersion: 1 as const, title: "T", lessons: [] };
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { content: course, user_id: "u1" }, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }),
      } as any;

      const { mutateCourse } = await import("../src/lib/mutate.js");
      const result = await mutateCourse(mockClient, "u1", "c1", (c) => ({ ...c, title: "Updated" }));
      expect(result).toBeNull();
    });

    it("propagates mutator exception", async () => {
      const course = { schemaVersion: 1 as const, title: "T", lessons: [] };
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { content: course, user_id: "u1" }, error: null }),
      } as any;

      const { mutateCourse } = await import("../src/lib/mutate.js");
      await expect(
        mutateCourse(mockClient, "u1", "c1", () => { throw new Error("mutator failed"); })
      ).rejects.toThrow("mutator failed");
    });
  });
  ```

- [ ] **Step 2: Run tests — all should pass**

  ```bash
  cd mcp && npm test 2>&1 | tail -10
  ```

  Expected: all pass. If `propagates mutator exception` fails because mutateCourse catches internally, adjust to test the actual behavior (returning an error string vs re-throwing).

- [ ] **Step 3: Commit**

  ```bash
  git add mcp/tests/mutate.test.ts
  git commit -m "test: extend mutate tests with error paths"
  ```

---

## Task 9: New tool-mocks.test.ts

**Files:**
- Create: `mcp/tests/tool-mocks.test.ts`

**Context:** Tests tool-level behavior using mock Supabase, without going through `withAuth`. Instead, tests the pure logic (extraction functions, transformation) that each tool relies on. References `mcp/src/tools/` files and helper functions directly.

- [ ] **Step 1: Identify what can be tested**

  Look at the tool files to find pure functions and logic that doesn't need network:
  - `mcp/src/tools/lessons.ts` — `get_lesson` extracts by lesson id
  - `mcp/src/tools/assessment.ts` — `replace_questions` replaces question bank
  - `mcp/src/tools/courses.ts` — `list_courses` maps rows to add `lesson_count`
  - `mcp/src/tools/preview.ts` — `analyzeCourse` already tested; `renderCourseToHtml` already tested
  - `mcp/src/tools/semantic.ts` — `save_course` validation behavior, `injectIds` already tested

  For tools with Supabase calls, test via mock client (same pattern as mutate.test.ts).

- [ ] **Step 2: Create the file**

  Create `mcp/tests/tool-mocks.test.ts`:

  ```typescript
  import { describe, it, expect, vi } from "vitest";
  import { validateCourseJson } from "../src/lib/validate.js";
  import { injectIds } from "../src/tools/semantic.js";
  import { uid } from "../src/lib/uid.js";
  import { ALL_BLOCKS, SAMPLE_QUESTIONS } from "./fixtures/blocks.js";

  // ─── get_lesson extraction logic ─────────────────────────────────────────────

  // Replicate the extraction logic from get_lesson (lessons.ts)
  function extractLesson(course: any, lessonId: string) {
    return course.lessons?.find((l: any) => l.id === lessonId) ?? null;
  }

  describe("get_lesson — extraction logic", () => {
    it("returns lesson_not_found sentinel for unknown id", () => {
      const course = { schemaVersion: 1, title: "T", lessons: [{ id: "l1", kind: "content", title: "L1", blocks: [] }] };
      expect(extractLesson(course, "unknown")).toBeNull();
    });

    it("returns content lesson by id", () => {
      const lesson = { id: "l1", kind: "content", title: "L1", blocks: ALL_BLOCKS.slice(0, 3) };
      const course = { schemaVersion: 1, title: "T", lessons: [lesson] };
      expect(extractLesson(course, "l1")).toEqual(lesson);
    });

    it("returns assessment lesson by id", () => {
      const lesson = { id: "l2", kind: "assessment", title: "Exam", questions: SAMPLE_QUESTIONS, config: {} };
      const course = { schemaVersion: 1, title: "T", lessons: [{ id: "l1", kind: "content", title: "L1", blocks: [] }, lesson] };
      expect(extractLesson(course, "l2")).toEqual(lesson);
    });
  });

  // ─── replace_questions contract ───────────────────────────────────────────────

  function simulateReplaceQuestions(incoming: any[]) {
    return incoming.map(q => ({ ...q, id: uid() }));
  }

  describe("replace_questions — contract", () => {
    it("all incoming questions get new IDs", () => {
      const incoming = SAMPLE_QUESTIONS.map(({ id, ...q }) => q); // strip IDs
      const result = simulateReplaceQuestions(incoming);
      expect(result).toHaveLength(2);
      result.forEach(q => {
        expect(typeof q.id).toBe("string");
        expect(q.id.length).toBeGreaterThan(0);
      });
    });

    it("old question IDs are not present in result", () => {
      const oldIds = new Set(SAMPLE_QUESTIONS.map(q => q.id));
      const incoming = SAMPLE_QUESTIONS.map(({ id, ...q }) => q);
      const result = simulateReplaceQuestions(incoming);
      result.forEach(q => expect(oldIds.has(q.id)).toBe(false));
    });

    it("replaces with empty array when incoming is empty", () => {
      const result = simulateReplaceQuestions([]);
      expect(result).toHaveLength(0);
    });
  });

  // ─── list_courses lesson_count derivation ────────────────────────────────────

  function deriveListRow(row: { id: string; title: string; is_public: boolean; updated_at: string; content: any }) {
    return {
      id: row.id,
      title: row.title,
      is_public: row.is_public,
      updated_at: row.updated_at,
      lesson_count: (row.content as any)?.lessons?.length ?? 0,
    };
  }

  describe("list_courses — lesson_count", () => {
    it("returns 0 for course with no lessons", () => {
      const row = { id: "c1", title: "T", is_public: false, updated_at: "2026-01-01", content: { schemaVersion: 1, title: "T", lessons: [] } };
      expect(deriveListRow(row).lesson_count).toBe(0);
    });

    it("returns 3 for course with 3 lessons", () => {
      const row = { id: "c1", title: "T", is_public: false, updated_at: "2026-01-01", content: { schemaVersion: 1, title: "T", lessons: [{}, {}, {}] } };
      expect(deriveListRow(row).lesson_count).toBe(3);
    });

    it("returns 0 when content is null", () => {
      const row = { id: "c1", title: "T", is_public: false, updated_at: "2026-01-01", content: null };
      expect(deriveListRow(row).lesson_count).toBe(0);
    });
  });

  // ─── save_course validation integration ──────────────────────────────────────

  describe("save_course — validation + inject pipeline", () => {
    it("valid megacourse with all 17 block types passes validation after inject", () => {
      const raw = {
        schemaVersion: 1,
        title: "Megacourse",
        lessons: [
          { kind: "content", title: "L1", blocks: ALL_BLOCKS },
          { kind: "assessment", title: "Exam", questions: SAMPLE_QUESTIONS.map(({ id, ...q }) => q), config: { passingScore: 80, examSize: 2 } },
        ],
      };
      const withIds = injectIds(raw);
      const result = validateCourseJson(withIds);
      expect(result.ok).toBe(true);
    });

    it("course with missing schemaVersion fails validation before any DB call", () => {
      const raw = { title: "No version", lessons: [] };
      const result = validateCourseJson(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.some(e => e.includes("schemaVersion"))).toBe(true);
    });

    it("lesson missing kind passes after injectIds adds kind:content", () => {
      const raw = { schemaVersion: 1, title: "T", lessons: [{ title: "No Kind", blocks: [] }] };
      const withIds = injectIds(raw); // injectIds fills in kind:content for lessons that lack it
      const result = validateCourseJson(withIds);
      expect(result.ok).toBe(true);
    });
  });

  // ─── restructure_course logic ─────────────────────────────────────────────────

  function simulateRestructure(lessons: any[], order: Array<{ lesson_id: string; title: string }>) {
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const orderIds = order.map(o => o.lesson_id);
    const missing = lessons.filter(l => !orderIds.includes(l.id)).map(l => l.id);
    if (missing.length > 0) {
      return { ok: false as const, error: "incomplete_lesson_order", missing };
    }
    return {
      ok: true as const,
      lessons: order.map(o => ({ ...lessonMap.get(o.lesson_id)!, title: o.title })),
    };
  }

  describe("restructure_course — order validation", () => {
    const lessons = [
      { id: "l1", kind: "content", title: "Lesson 1", blocks: [] },
      { id: "l2", kind: "content", title: "Lesson 2", blocks: [] },
    ];

    it("returns incomplete_lesson_order when a lesson is omitted", () => {
      const result = simulateRestructure(lessons, [{ lesson_id: "l1", title: "Lesson 1" }]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("incomplete_lesson_order");
        expect(result.missing).toContain("l2");
      }
    });

    it("reorders lessons when all IDs present", () => {
      const result = simulateRestructure(lessons, [
        { lesson_id: "l2", title: "Renamed L2" },
        { lesson_id: "l1", title: "Renamed L1" },
      ]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.lessons[0].id).toBe("l2");
        expect(result.lessons[1].id).toBe("l1");
        expect(result.lessons[0].title).toBe("Renamed L2");
      }
    });
  });

  // ─── view_url format ──────────────────────────────────────────────────────────

  describe("view_url — format", () => {
    it("builds view_url from APP_URL and course_id", () => {
      const APP_URL = "https://tidelearn.com";
      const courseId = "abc-123";
      expect(`${APP_URL}/view?id=${courseId}`).toBe("https://tidelearn.com/view?id=abc-123");
    });

    it("respects APP_URL override for local dev", () => {
      const APP_URL = "http://localhost:5173";
      const courseId = "xyz-456";
      expect(`${APP_URL}/view?id=${courseId}`).toBe("http://localhost:5173/view?id=xyz-456");
    });

    it("mcp_callback URL includes encoded callback", () => {
      const APP_URL = "https://tidelearn.com";
      const callbackUrl = "http://localhost:38472/callback";
      const loginUrl = `${APP_URL}/auth?mcp_callback=${encodeURIComponent(callbackUrl)}`;
      const parsed = new URL(loginUrl);
      expect(parsed.pathname).toBe("/auth");
      expect(parsed.searchParams.get("mcp_callback")).toBe(callbackUrl);
    });
  });
  ```

- [ ] **Step 3: Run tests — all should pass**

  ```bash
  cd mcp && npm test 2>&1 | tail -15
  ```

  Expected: all pass. The final test count should be ≥120.

- [ ] **Step 4: Verify total test count**

  ```bash
  cd mcp && npm test 2>&1 | grep -E "Tests " | tail -3
  ```

  Expected: ≥120 tests passing.

- [ ] **Step 5: Commit**

  ```bash
  git add mcp/tests/tool-mocks.test.ts
  git commit -m "test: add tool-mocks.test.ts with 25 tool-level logic tests"
  ```

---

## Task 10: Write agentic playbook

**Files:**
- Create: `docs/testing/mcp-stress-playbook.md`

**Context:** This is the source document for agentic execution. Copy the playbook from the spec verbatim, then add the "How to run" section. Claude will read this document and execute each numbered step using MCP tools.

- [ ] **Step 1: Create the docs/testing directory**

  ```bash
  mkdir -p docs/testing
  ```

- [ ] **Step 2: Create the playbook file**

  Create `docs/testing/mcp-stress-playbook.md` with the following content:

  ````markdown
  # MCP Stress Test Playbook

  **Format:** Numbered steps with expected results. Claude reads this file and executes each step using TideLearn MCP tools, logging `[PASS]` or `[FAIL: reason]` after each step, then produces a final summary table.

  **Agent account:** Uses the agent Google account (stored in memory) — already registered on TideLearn.

  **Course naming:** All test courses prefixed `[STRESS TEST]` for easy cleanup.

  **How to run:**
  1. Ensure the MCP server is connected and `APP_URL` is set to the right environment
  2. Ask Claude: "Run the MCP stress test playbook at `docs/testing/mcp-stress-playbook.md`"
  3. Claude will execute each scenario in order and log results inline
  4. At the end, Claude produces a summary table: Scenario | Steps | Pass | Fail

  ---

  ## Scenario 1 — Auth flow

  | # | Action | Expected |
  |---|--------|----------|
  | 1.1 | `tidelearn_login` | Returns URL pointing to `${APP_URL}/auth?mcp_callback=...` |
  | 1.2 | Open URL in browser, sign in with Google (agent account) | Browser redirects to localhost callback, tab shows "Logged in successfully" |
  | 1.3 | `list_courses` | Returns array without error |
  | 1.4 | `tidelearn_logout` | Success |
  | 1.5 | `list_courses` | Returns `auth_required` error |
  | 1.6 | `tidelearn_login` again | Works, session restored |

  ---

  ## Scenario 2 — Course scaffold

  | # | Action | Expected |
  |---|--------|----------|
  | 2.1 | `create_course("[STRESS TEST] Scaffold")` | Returns `course_id` and `view_url` containing `/view?id=` |
  | 2.2 | `list_courses` | New course appears with `lesson_count: 0` |
  | 2.3 | `get_course(course_id)` | Returns course with 0 lessons |
  | 2.4 | `add_lesson(course_id, "Lesson One")` | Returns `lesson_id` |
  | 2.5 | `add_lesson(course_id, "Lesson Two")` | Returns different `lesson_id` |
  | 2.6 | `get_course(course_id)` | Returns 2 lessons |
  | 2.7 | `list_courses` | Course shows `lesson_count: 2` |

  ---

  ## Scenario 3 — All 17 block types via `add_block`

  Using the course from Scenario 2, Lesson One. Add one of each block type. For `image`: `src: "https://picsum.photos/800/400"`. For `document`: `src: "https://www.w3.org/WAI/WCAG21/wcag21.pdf"`.

  | # | Block type | Expected |
  |---|-----------|----------|
  | 3.1 | `heading` | Success, block_id returned |
  | 3.2 | `text` | Success |
  | 3.3 | `image` | Success |
  | 3.4 | `video` | Success |
  | 3.5 | `audio` | Success |
  | 3.6 | `document` | Success |
  | 3.7 | `quiz` | Success |
  | 3.8 | `truefalse` | Success |
  | 3.9 | `shortanswer` | Success |
  | 3.10 | `list` | Success |
  | 3.11 | `callout` | Success |
  | 3.12 | `accordion` (omit item IDs — server injects) | Success |
  | 3.13 | `tabs` (omit item IDs) | Success |
  | 3.14 | `quote` | Success |
  | 3.15 | `code` | Success |
  | 3.16 | `divider` | Success |
  | 3.17 | `toc` | Success |
  | 3.18 | `preview_course(course_id)` | HTML returned, no `[Unknown block type]` present |
  | 3.19 | `get_lesson(course_id, lesson_id)` | Returns lesson with 17 blocks |

  ---

  ## Scenario 4 — `save_course` megacourse

  Single `save_course` call with `schemaVersion: 1`, 2 content lessons (each 5+ varied blocks including accordion, tabs, quiz), 1 assessment lesson (10 questions, all with `bloomLevel` and `source`).

  | # | Check | Expected |
  |---|-------|----------|
  | 4.1 | `save_course(megacourse_json)` | Returns `course_id` and `view_url` |
  | 4.2 | `get_course(course_id)` | 3 lessons, lesson kinds correct |
  | 4.3 | Content lesson blocks count | Matches what was sent |
  | 4.4 | Assessment lesson question count | 10 |
  | 4.5 | `preview_course(course_id)` | Assessment questions shown with ✓ markers |
  | 4.6 | `review_course(course_id)` | No `no_assessment` gaps (assessment lesson present) |

  ---

  ## Scenario 5 — Assessment deep test

  | # | Action | Expected |
  |---|--------|----------|
  | 5.1 | `add_assessment_lesson(course_id, "[STRESS TEST] Exam")` | Returns `lesson_id` |
  | 5.2 | `import_questions(course_id, lesson_id, questions[50])` | Returns `{ imported: 50 }` |
  | 5.3 | `list_questions(course_id, lesson_id)` | Returns 50 questions |
  | 5.4 | `add_question(course_id, lesson_id, question)` | Returns `question_id` |
  | 5.5 | `list_questions` again | 51 questions |
  | 5.6 | `update_question(course_id, lesson_id, question_id, { text: "Updated" })` | Success |
  | 5.7 | `list_questions` — check updated question | Text matches "Updated" |
  | 5.8 | `replace_questions(course_id, lesson_id, questions[10])` | Returns `{ replaced: 10, question_ids: [...] }` — 10 new IDs |
  | 5.9 | `list_questions` | 10 questions, none with old IDs |
  | 5.10 | `delete_question(course_id, lesson_id, question_ids[0])` | Success |
  | 5.11 | `list_questions` | 9 questions |
  | 5.12 | `update_assessment_config(course_id, lesson_id, { passingScore: 75, examSize: 8 })` | Success |
  | 5.13 | `get_lesson(course_id, lesson_id)` | Config shows `passingScore: 75, examSize: 8` |

  ---

  ## Scenario 6 — Editing tools

  | # | Action | Expected |
  |---|--------|----------|
  | 6.1 | `get_lesson(course_id, content_lesson_id)` | Returns lesson with blocks |
  | 6.2 | `update_block(course_id, lesson_id, block_id, { text: "Updated heading" })` | Success |
  | 6.3 | `get_lesson` | Block text updated |
  | 6.4 | `rewrite_lesson(course_id, lesson_id, [heading, text, quiz])` | Success — 3 blocks |
  | 6.5 | `get_lesson` | Exactly 3 blocks, previous blocks gone |
  | 6.6 | `rewrite_blocks(course_id, [{ lesson_id, block_id, updated_block }, ...])` | Success |
  | 6.7 | `add_block(course_id, lesson_id, divider, position: 0)` | Success, divider at position 0 |
  | 6.8 | `move_block(course_id, lesson_id, block_id, new_position: 2)` | Success |
  | 6.9 | `delete_block(course_id, lesson_id, block_id)` | Success |
  | 6.10 | `restructure_course(course_id, [{ lesson_id: l2, title: "Renamed L2" }, { lesson_id: l1, title: "Renamed L1" }])` | Success, order reversed |
  | 6.11 | `get_course(course_id)` | Lessons in new order with new titles |

  ---

  ## Scenario 7 — Review and preview

  | # | Action | Expected |
  |---|--------|----------|
  | 7.1 | Create sparse course: 1 lesson, 1 heading block only | — |
  | 7.2 | `review_course(course_id)` | Gaps include: `no_media`, `no_assessment` |
  | 7.3 | Add image, text, quiz blocks | — |
  | 7.4 | `review_course` again | Fewer gaps |
  | 7.5 | Add assessment lesson with ≥1 question that has a `feedback` field | — |
  | 7.6 | `review_course` again | No `no_assessment` gap |
  | 7.7 | `preview_course` on content lesson | All block types render correctly |
  | 7.8 | `preview_course` on full course | Assessment questions shown with ✓ markers; feedback shown for questions that have a `feedback` field |

  ---

  ## Scenario 8 — Publish flow

  | # | Action | Expected |
  |---|--------|----------|
  | 8.1 | `update_course(course_id, { is_public: true })` | Returns `view_url` and note about public access |
  | 8.2 | `list_courses` | Course shows `is_public: true` |
  | 8.3 | `update_course(course_id, { title: "Renamed" })` | Returns `{ updated: true }` — no `view_url` (title-only update, `is_public` not passed as `true`) |
  | 8.4 | `get_course(course_id)` | Title updated |

  ---

  ## Scenario 9 — Robustness pass

  Every check below should return a meaningful error, not crash or return generic 500.

  | # | Action | Expected error |
  |---|--------|----------------|
  | 9.1 | `get_course("00000000-0000-0000-0000-000000000000")` | `course_not_found` |
  | 9.2 | `get_lesson(valid_course_id, "00000000-0000-0000-0000-000000000000")` | `lesson_not_found` |
  | 9.3 | `add_block(course_id, assessment_lesson_id, heading_block)` | Named error, not a crash |
  | 9.4 | `add_question(course_id, content_lesson_id, question)` | Named error, not a crash |
  | 9.5 | `replace_questions(course_id, content_lesson_id, questions)` | `not_assessment` |
  | 9.6 | `delete_question(course_id, content_lesson_id, "fake-id")` | Named error, not a crash |
  | 9.7 | `restructure_course(course_id, [lesson_1_only])` (omit lesson 2) | `incomplete_lesson_order` with missing lesson ID named |
  | 9.8 | `save_course({ title: "No version", lessons: [] })` (missing schemaVersion) | Validation error mentioning `schemaVersion` |
  | 9.9 | `save_course({ schemaVersion: 1, title: "T", lessons: [{ title: "No kind", blocks: [] }] })` | (After inject, kind is added — this may succeed. Test and document actual behaviour.) |
  | 9.10 | `add_block(course_id, lesson_id, { type: "banner", text: "hello" })` | `invalid_block_type` or similar — named error |
  | 9.11 | `add_question(course_id, lesson_id, { text: "Q", options: ["A","B","C"], correctIndex: 0 })` | Error (3 options, need 4) |
  | 9.12 | `update_block(valid_ids, "00000000-0000-0000-0000-000000000000", {})` | Named error, not a crash |
  | 9.13 | `delete_block(valid_ids, "00000000-0000-0000-0000-000000000000")` | Named error, not a crash |
  | 9.14 | `move_block(valid_ids, block_id, 9999)` | Error or clamped — document current behaviour |
  | 9.15 | `import_questions` with one invalid question (3 options) in a batch of 5 | All-or-nothing: 0 imported, error |

  ---

  ## Scenario 10 — Cleanup

  | # | Action | Expected |
  |---|--------|----------|
  | 10.1 | `list_courses` — collect all `[STRESS TEST]` course IDs | — |
  | 10.2 | `delete_course` for each | Success |
  | 10.3 | `list_courses` | No `[STRESS TEST]` courses remain |

  ---

  ## Summary table template

  After running all scenarios, Claude outputs:

  | Scenario | Steps | Pass | Fail | Notes |
  |----------|-------|------|------|-------|
  | 1 — Auth | 6 | ? | ? | |
  | 2 — Scaffold | 7 | ? | ? | |
  | 3 — All blocks | 19 | ? | ? | |
  | 4 — Megacourse | 6 | ? | ? | |
  | 5 — Assessment | 13 | ? | ? | |
  | 6 — Editing | 11 | ? | ? | |
  | 7 — Review/preview | 8 | ? | ? | |
  | 8 — Publish | 4 | ? | ? | |
  | 9 — Robustness | 15 | ? | ? | |
  | 10 — Cleanup | 3 | ? | ? | |
  | **Total** | **92** | | | |
  ````

- [ ] **Step 3: Commit**

  ```bash
  git add docs/testing/mcp-stress-playbook.md
  git commit -m "docs: add MCP stress test playbook (92 steps, 10 scenarios)"
  ```

---

## Task 11: Run the agentic playbook

**Context:** Claude (in a session with MCP tools connected) reads the playbook and executes each step. This requires:
- MCP server running and connected
- App running at `APP_URL` (local or production)
- Agent Google account credentials (stored in memory)

- [ ] **Step 1: Verify MCP is built and connected**

  ```bash
  cd mcp && npm run build 2>&1 | tail -5
  ```

- [ ] **Step 2: Start local dev server if testing locally**

  ```bash
  APP_URL=http://localhost:5173 npm run dev
  ```

  In a new terminal, set the MCP's `APP_URL`:

  ```bash
  APP_URL=http://localhost:5173 npx tsx mcp/src/index.ts
  ```

- [ ] **Step 3: Invoke playbook**

  In a Claude session with TideLearn MCP connected, run:

  > "Run the MCP stress test playbook at `docs/testing/mcp-stress-playbook.md`. Execute each scenario in order and log [PASS] or [FAIL: reason] for each step. Produce a summary table at the end."

- [ ] **Step 4: Record results**

  Claude logs results inline and produces a summary table. Any failures should be noted for follow-up.

- [ ] **Step 5: Commit playbook results**

  If the playbook produced a results log, save it:

  ```bash
  # Save Claude's output to docs/testing/mcp-stress-results-YYYY-MM-DD.md
  git add docs/testing/
  git commit -m "test: MCP stress playbook results YYYY-MM-DD"
  ```

---

## Verification checklist

Before calling this plan complete:

- [ ] `cd mcp && npm test` — all tests pass, count ≥120
- [ ] `npm run build` — no TypeScript errors in MCP
- [ ] `npm run build` in root — no TypeScript errors in app
- [ ] Auth fix verified end-to-end (at least email/password path) via Scenario 1
- [ ] All 10 playbook scenarios complete with summary table
