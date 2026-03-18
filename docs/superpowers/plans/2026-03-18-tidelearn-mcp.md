# TideLearn MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local MCP server that gives Claude Desktop full read/write access to TideLearn courses via 27 tools, with browser-based OAuth login and macOS Keychain token storage.

**Architecture:** Node.js stdio MCP server living in `mcp/` inside the TideLearn repo. All course mutations are read-modify-write operations on the `content` JSONB column. Auth uses Supabase OAuth PKCE flow with a temporary local HTTP callback server; tokens are persisted in macOS Keychain via `keytar`. Media uploads use a separate service-role Supabase client.

**Tech Stack:** `@modelcontextprotocol/sdk` (MCP server), `@supabase/supabase-js` ^2.55 (already in project), `keytar` (macOS Keychain), `zod` (validation), `vitest` (tests), TypeScript + `tsx` (dev), `tsc` (build)

---

## File Map

| File | Responsibility |
|---|---|
| `mcp/src/index.ts` | Entry point — creates MCP server, registers all tools, connects stdio transport |
| `mcp/src/lib/types.ts` | Course/Lesson/Block types and Zod schemas (mirrored from `src/types/course.ts`) |
| `mcp/src/lib/uid.ts` | UUID generation (same `uid()` as the app) |
| `mcp/src/lib/auth.ts` | OAuth PKCE flow, local callback server (port 54399), Keychain read/write via keytar |
| `mcp/src/lib/supabase.ts` | Two clients: `getUserClient()` (user session) and `getStorageClient()` (service role) |
| `mcp/src/lib/mutate.ts` | `mutateCourse()` helper — fetch → patch in memory → save JSONB |
| `mcp/src/tools/courses.ts` | 6 course CRUD tool handlers |
| `mcp/src/tools/lessons.ts` | 5 lesson CRUD tool handlers |
| `mcp/src/tools/blocks.ts` | 5 block CRUD tool handlers |
| `mcp/src/tools/semantic.ts` | 10 semantic tool handlers |
| `mcp/src/tools/preview.ts` | `preview_course` HTML renderer + `review_course` analyser |
| `mcp/src/tools/media.ts` | `upload_media` handler |
| `mcp/tests/uid.test.ts` | UID uniqueness and format |
| `mcp/tests/preview.test.ts` | HTML output for each block type |
| `mcp/tests/courses.test.ts` | Course CRUD with mocked Supabase |
| `mcp/tests/mutate.test.ts` | `mutateCourse` patch logic |
| `mcp/package.json` | Dependencies and scripts |
| `mcp/tsconfig.json` | TypeScript config |
| `mcp/.env.example` | Documents `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |

---

## Task 1: Project Scaffold

**Files:**
- Create: `mcp/package.json`
- Create: `mcp/tsconfig.json`
- Create: `mcp/.env.example`
- Create: `mcp/.gitignore`

- [ ] **Step 1: Create `mcp/package.json`**

```json
{
  "name": "tidelearn-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.10.0",
    "@supabase/supabase-js": "^2.55.0",
    "keytar": "^7.9.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `mcp/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `mcp/.env.example`**

```
# Required: your Supabase project URL
SUPABASE_URL=https://rljldeobjtgoqttuxhsf.supabase.co

# Required: anon/public key — used for OAuth login flow
# Get from: Supabase dashboard → Project Settings → API → anon/public key
SUPABASE_ANON_KEY=

# Required: service role key — for storage uploads ONLY
# Get from: Supabase dashboard → Project Settings → API → service_role key
# NEVER commit the real value. Keep this in mcp/.env only.
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 4: Create `mcp/.gitignore`**

```
node_modules/
dist/
.env
```

- [ ] **Step 5: Install dependencies**

```bash
cd mcp && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add mcp/package.json mcp/tsconfig.json mcp/.env.example mcp/.gitignore
git commit -m "feat(mcp): scaffold project structure"
```

---

## Task 2: Types and UID

**Files:**
- Create: `mcp/src/lib/types.ts`
- Create: `mcp/src/lib/uid.ts`
- Create: `mcp/tests/uid.test.ts`

- [ ] **Step 1: Write failing test for uid**

```typescript
// mcp/tests/uid.test.ts
import { describe, it, expect } from "vitest";
import { uid } from "../src/lib/uid.js";

describe("uid", () => {
  it("returns a string in UUID v4 format", () => {
    const id = uid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("returns a unique value each call", () => {
    const ids = new Set(Array.from({ length: 100 }, uid));
    expect(ids.size).toBe(100);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd mcp && npm test tests/uid.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Create `mcp/src/lib/uid.ts`**

```typescript
export function uid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd mcp && npm test tests/uid.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Create `mcp/src/lib/types.ts`**

Copy all types, Zod schemas, and the `factories` object from `src/types/course.ts`. Add this export at the bottom:

```typescript
// Re-export uid for use in other modules
export { uid } from "./uid.js";
```

The only change from the original: remove the React import (there isn't one) and ensure all imports reference `./uid.js`.

- [ ] **Step 6: Commit**

```bash
git add mcp/src/lib/uid.ts mcp/src/lib/types.ts mcp/tests/uid.test.ts
git commit -m "feat(mcp): add types and uid module"
```

---

## Task 3: Auth Module

**Files:**
- Create: `mcp/src/lib/auth.ts`

This is the most complex module. It handles:
1. Reading/writing session tokens via macOS Keychain (`keytar`)
2. Starting a temporary HTTP callback server on port 54399
3. Generating the Supabase OAuth URL (PKCE flow)
4. Exchanging the auth code for a session token

- [ ] **Step 1: Create `mcp/src/lib/auth.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";
import * as keytar from "keytar";
import * as http from "http";
import { URL } from "url";

const KEYCHAIN_SERVICE = "tidelearn-mcp";
const KEYCHAIN_ACCOUNT = "session";
const CALLBACK_PORT = 54399;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

export type StoredSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp seconds
};

/** Read session from macOS Keychain. Returns null if not found. */
export async function loadSession(): Promise<StoredSession | null> {
  const raw = await keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

/** Persist session to macOS Keychain. */
export async function saveSession(session: StoredSession): Promise<void> {
  await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, JSON.stringify(session));
}

/** Remove session from Keychain (logout). */
export async function clearSession(): Promise<void> {
  await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
}

/** Returns true if the stored session is still valid (not expired). */
export function isSessionValid(session: StoredSession): boolean {
  // Add a 60-second buffer before expiry
  return session.expires_at > Math.floor(Date.now() / 1000) + 60;
}

/**
 * Build the Supabase OAuth URL for Google/Apple/email magic link.
 * Uses PKCE flow — the Supabase client stores the verifier internally.
 * Returns the URL to show the user.
 */
export async function buildLoginUrl(
  supabaseUrl: string,
  supabaseAnonKey: string,
  provider: "google" | "azure" = "google"
): Promise<{ url: string; client: ReturnType<typeof createClient> }> {
  // In-memory storage for PKCE verifier (lives only during this auth flow)
  const storage: Record<string, string> = {};
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => { storage[key] = value; },
        removeItem: (key: string) => { delete storage[key]; },
      },
      flowType: "pkce",
    },
  });

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: CALLBACK_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    throw new Error(`Failed to build login URL: ${error?.message}`);
  }

  return { url: data.url, client };
}

/**
 * Start a one-shot HTTP server on port 54399.
 * Waits for Supabase to redirect the browser back with ?code=...
 * Returns the auth code.
 */
export function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Login timed out after 5 minutes"));
    }, 5 * 60 * 1000);

    const server = http.createServer((req, res) => {
      const parsed = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
      const code = parsed.searchParams.get("code");

      res.writeHead(200, { "Content-Type": "text/html" });
      if (code) {
        res.end(
          "<html><body><h2>Logged in to TideLearn ✓</h2><p>You can close this tab.</p></body></html>"
        );
        clearTimeout(timeout);
        server.close();
        resolve(code);
      } else {
        const error = parsed.searchParams.get("error_description") ?? "Unknown error";
        res.end(`<html><body><h2>Login failed</h2><p>${error}</p></body></html>`);
        clearTimeout(timeout);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
      }
    });

    server.listen(CALLBACK_PORT, "localhost");
  });
}

/**
 * Exchange auth code for session using the same client that generated the URL.
 * Must use the same client (same PKCE verifier in memory).
 */
export async function exchangeCode(
  client: ReturnType<typeof createClient>,
  code: string
): Promise<StoredSession> {
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    throw new Error(`Failed to exchange code: ${error?.message}`);
  }
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };
}

/**
 * Use the refresh token to get a new access token.
 * Saves the updated session to Keychain.
 */
export async function refreshSession(
  supabaseUrl: string,
  supabaseAnonKey: string,
  session: StoredSession
): Promise<StoredSession> {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error || !data.session) {
    throw new Error(`Failed to refresh session: ${error?.message}`);
  }
  const refreshed: StoredSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };
  await saveSession(refreshed);
  return refreshed;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mcp && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mcp/src/lib/auth.ts
git commit -m "feat(mcp): add OAuth + Keychain auth module"
```

---

## Task 4: Supabase Clients and Auth Middleware

**Files:**
- Create: `mcp/src/lib/supabase.ts`

Two clients:
1. **User client** — authenticated with the user's OAuth session. Used for all course/lesson/block operations. Respects RLS.
2. **Storage client** — authenticated with service role key. Used only for `upload_media`.

- [ ] **Step 1: Create `mcp/src/lib/supabase.ts`**

```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  loadSession,
  saveSession,
  isSessionValid,
  refreshSession,
  buildLoginUrl,
  waitForAuthCode,
  exchangeCode,
  type StoredSession,
} from "./auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL env var is required");
if (!SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is required");

/** MCP tool response shape */
export type ToolResult = { content: Array<{ type: "text"; text: string }> };

/** Helper: return a plain-text tool result */
export function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/** Helper: return an error tool result */
export function err(code: string, message: string): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify({ code, message }) }] };
}

/**
 * Get an authenticated Supabase client for the current user.
 * If no valid session exists, returns a login URL for the user to visit.
 * Caller should check result.loginUrl first.
 */
export async function getAuthenticatedClient(): Promise<
  | { client: SupabaseClient; session: StoredSession; loginUrl: null }
  | { client: null; session: null; loginUrl: string }
> {
  let session = await loadSession();

  if (session && !isSessionValid(session)) {
    try {
      session = await refreshSession(SUPABASE_URL, SUPABASE_ANON_KEY, session);
    } catch {
      session = null;
    }
  }

  if (!session) {
    const { url } = await buildLoginUrl(SUPABASE_URL, SUPABASE_ANON_KEY);
    return { client: null, session: null, loginUrl: url };
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${session.access_token}` },
    },
  });

  return { client, session, loginUrl: null };
}

/**
 * Middleware wrapper for all tool handlers.
 * Checks auth, returns login URL if unauthenticated.
 */
export async function withAuth(
  handler: (client: SupabaseClient, userId: string) => Promise<ToolResult>
): Promise<ToolResult> {
  const auth = await getAuthenticatedClient();
  if (auth.loginUrl) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            code: "auth_required",
            message: "Please log in to TideLearn first.",
            login_url: auth.loginUrl,
          }),
        },
      ],
    };
  }

  // Extract user_id from the JWT payload
  const payload = JSON.parse(
    Buffer.from(auth.session.access_token.split(".")[1], "base64url").toString()
  );
  const userId: string = payload.sub;

  return handler(auth.client!, userId);
}

/** Service role client for storage operations only */
export function getStorageClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}
```

**Note on SUPABASE_ANON_KEY:** The anon key is needed for the OAuth PKCE flow. Add it to `.env.example`:
```
SUPABASE_ANON_KEY=<from Supabase dashboard → Project Settings → API → anon/public key>
```
Update `mcp/src/index.ts` Claude Desktop config section of the spec accordingly when wiring up.

- [ ] **Step 2: Update `.env.example` to include anon key**

Add to `mcp/.env.example`:
```
# Required: anon/public key — used for OAuth login flow
SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Compile check**

```bash
cd mcp && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add mcp/src/lib/supabase.ts mcp/.env.example
git commit -m "feat(mcp): add Supabase clients and auth middleware"
```

---

## Task 5: mutateCourse Helper

**Files:**
- Create: `mcp/src/lib/mutate.ts`
- Create: `mcp/tests/mutate.test.ts`

Every lesson/block operation follows the same pattern: fetch course JSON, mutate in memory, save back. This helper encapsulates that.

- [ ] **Step 1: Write failing tests**

```typescript
// mcp/tests/mutate.test.ts
import { describe, it, expect, vi } from "vitest";

// mutateCourse is tested by injecting a mock Supabase client
describe("mutateCourse", () => {
  it("fetches, applies mutation, and saves", async () => {
    const course = {
      schemaVersion: 1 as const,
      title: "Test",
      lessons: [{ id: "l1", title: "L1", blocks: [] }],
    };

    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { content: course, user_id: "u1" },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    } as any;

    // Make update chain return success
    mockClient.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { mutateCourse } = await import("../src/lib/mutate.js");
    const result = await mutateCourse(mockClient, "u1", "c1", (c) => {
      c.title = "Updated";
      return c;
    });

    expect(result).toBeNull(); // null = success
  });

  it("returns error string when course not found", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    } as any;

    const { mutateCourse } = await import("../src/lib/mutate.js");
    const result = await mutateCourse(mockClient, "u1", "bad-id", (c) => c);
    expect(result).toBe("course_not_found");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd mcp && npm test tests/mutate.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Create `mcp/src/lib/mutate.ts`**

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import { Course } from "./types.js";

/**
 * Fetch a course, apply a mutation function, and save it back.
 * Returns null on success, or an error code string on failure.
 */
export async function mutateCourse(
  client: SupabaseClient,
  userId: string,
  courseId: string,
  mutator: (course: Course) => Course
): Promise<string | null> {
  const { data, error } = await client
    .from("courses")
    .select("content, user_id")
    .eq("id", courseId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return "course_not_found";

  const updated = mutator(data.content as Course);

  const { error: updateError } = await client
    .from("courses")
    .update({ content: updated, title: updated.title })
    .eq("id", courseId)
    .eq("user_id", userId);

  if (updateError) return "update_failed";
  return null;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd mcp && npm test tests/mutate.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add mcp/src/lib/mutate.ts mcp/tests/mutate.test.ts
git commit -m "feat(mcp): add mutateCourse helper with tests"
```

---

## Task 6: Course CRUD Tools

**Files:**
- Create: `mcp/src/tools/courses.ts`
- Create: `mcp/tests/courses.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// mcp/tests/courses.test.ts
import { describe, it, expect, vi } from "vitest";
import { registerCourseTools } from "../src/tools/courses.js";

describe("registerCourseTools", () => {
  it("registers exactly 6 tools", () => {
    const mockServer = { tool: vi.fn() };
    registerCourseTools(mockServer as any);
    expect(mockServer.tool).toHaveBeenCalledTimes(6);
  });

  it("registers list_courses", () => {
    const mockServer = { tool: vi.fn() };
    registerCourseTools(mockServer as any);
    const names = mockServer.tool.mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain("list_courses");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd mcp && npm test tests/courses.test.ts
```

- [ ] **Step 3: Create `mcp/src/tools/courses.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { uid } from "../lib/uid.js";
import { courseSchema } from "../lib/types.js";

export function registerCourseTools(server: McpServer) {
  server.tool("list_courses", "List all courses for the logged-in user", {}, async () =>
    withAuth(async (client, userId) => {
      const { data, error } = await client
        .from("courses")
        .select("id, title, is_public, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) return err("query_failed", error.message);
      return ok(data);
    })
  );

  server.tool(
    "get_course",
    "Get the full content of a course including all lessons and blocks",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("id, title, is_public, content, created_at, updated_at")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        return ok(data);
      })
  );

  server.tool(
    "create_course",
    "Create a new empty course",
    { title: z.string().min(1) },
    async ({ title }) =>
      withAuth(async (client, userId) => {
        const content = { schemaVersion: 1, title, lessons: [] };
        const { data, error } = await client
          .from("courses")
          .insert({ user_id: userId, title, content, is_public: false })
          .select("id")
          .single();

        if (error || !data) return err("insert_failed", error?.message ?? "Unknown error");
        return ok({ course_id: data.id });
      })
  );

  server.tool(
    "update_course_title",
    "Rename a course",
    { course_id: z.string().uuid(), title: z.string().min(1) },
    async ({ course_id, title }) =>
      withAuth(async (client, userId) => {
        const { mutateCourse } = await import("../lib/mutate.js");
        const error = await mutateCourse(client, userId, course_id, (c) => ({
          ...c,
          title,
        }));
        if (error) return err(error, `Failed to update course title`);
        return ok({ message: "Course title updated" });
      })
  );

  server.tool(
    "delete_course",
    "Permanently delete a course",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { error } = await client
          .from("courses")
          .delete()
          .eq("id", course_id)
          .eq("user_id", userId);

        if (error) return err("delete_failed", error.message);
        return ok({ message: "Course deleted" });
      })
  );

  server.tool(
    "set_course_visibility",
    "Set a course to public or private",
    { course_id: z.string().uuid(), is_public: z.boolean() },
    async ({ course_id, is_public }) =>
      withAuth(async (client, userId) => {
        const { error } = await client
          .from("courses")
          .update({ is_public })
          .eq("id", course_id)
          .eq("user_id", userId);

        if (error) return err("update_failed", error.message);
        return ok({ message: `Course is now ${is_public ? "public" : "private"}` });
      })
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd mcp && npm test tests/courses.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/courses.ts mcp/tests/courses.test.ts
git commit -m "feat(mcp): add course CRUD tools"
```

---

## Task 7: Lesson CRUD Tools

**Files:**
- Create: `mcp/src/tools/lessons.ts`

- [ ] **Step 1: Create `mcp/src/tools/lessons.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid } from "../lib/uid.js";

export function registerLessonTools(server: McpServer) {
  server.tool(
    "list_lessons",
    "List all lessons in a course with their positions",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        const lessons = (data.content as any).lessons ?? [];
        return ok(lessons.map((l: any, i: number) => ({ id: l.id, title: l.title, position: i + 1 })));
      })
  );

  server.tool(
    "add_lesson",
    "Add a new lesson to a course",
    {
      course_id: z.string().uuid(),
      title: z.string().min(1),
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, title, position }) =>
      withAuth(async (client, userId) => {
        const lessonId = uid();
        const newLesson = { id: lessonId, title, blocks: [] };
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessons = [...course.lessons];
          const idx = position ? Math.min(position - 1, lessons.length) : lessons.length;
          lessons.splice(idx, 0, newLesson);
          return { ...course, lessons };
        });
        if (mutError) return err(mutError, "Failed to add lesson");
        return ok({ lesson_id: lessonId });
      })
  );

  server.tool(
    "update_lesson_title",
    "Rename a lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      title: z.string().min(1),
    },
    async ({ course_id, lesson_id, title }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id === lesson_id ? { ...l, title } : l
          ),
        }));
        if (mutError) return err(mutError, "Failed to update lesson");
        return ok({ message: "Lesson title updated" });
      })
  );

  server.tool(
    "reorder_lesson",
    "Move a lesson to a new position (1-based, splice semantics)",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      new_position: z.number().int().positive(),
    },
    async ({ course_id, lesson_id, new_position }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessons = [...course.lessons];
          const fromIdx = lessons.findIndex((l) => l.id === lesson_id);
          if (fromIdx === -1) return course;
          const [lesson] = lessons.splice(fromIdx, 1);
          const toIdx = Math.min(new_position - 1, lessons.length);
          lessons.splice(toIdx, 0, lesson);
          return { ...course, lessons };
        });
        if (mutError) return err(mutError, "Failed to reorder lesson");
        return ok({ message: "Lesson reordered" });
      })
  );

  server.tool(
    "delete_lesson",
    "Remove a lesson and all its blocks from a course",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.filter((l) => l.id !== lesson_id),
        }));
        if (mutError) return err(mutError, "Failed to delete lesson");
        return ok({ message: "Lesson deleted" });
      })
  );
}
```

- [ ] **Step 2: Compile check**

```bash
cd mcp && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mcp/src/tools/lessons.ts
git commit -m "feat(mcp): add lesson CRUD tools"
```

---

## Task 8: Block CRUD Tools

**Files:**
- Create: `mcp/src/tools/blocks.ts`

- [ ] **Step 1: Create `mcp/src/tools/blocks.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid, blockSchema, Block } from "../lib/types.js";

export function registerBlockTools(server: McpServer) {
  server.tool(
    "list_blocks",
    "List all blocks in a lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        const lesson = (data.content as any).lessons?.find((l: any) => l.id === lesson_id);
        if (!lesson) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
        return ok(lesson.blocks.map((b: any, i: number) => ({ id: b.id, type: b.type, position: i + 1 })));
      })
  );

  server.tool(
    "add_block",
    "Add a block to a lesson. Omit the 'id' field — it will be generated automatically.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block: z.record(z.unknown()), // validated against blockSchema after id injection
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, lesson_id, block, position }) =>
      withAuth(async (client, userId) => {
        // Inject a new id and validate
        const withId = { ...block, id: uid() };
        const parsed = blockSchema.safeParse(withId);
        if (!parsed.success) {
          return err("invalid_block_type", parsed.error.issues[0]?.message ?? "Invalid block");
        }
        const newBlock = parsed.data;
        const blockId = newBlock.id;

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) => {
            if (l.id !== lesson_id) return l;
            const blocks = [...l.blocks];
            const idx = position ? Math.min(position - 1, blocks.length) : blocks.length;
            blocks.splice(idx, 0, newBlock);
            return { ...l, blocks };
          }),
        }));

        if (mutError) return err(mutError, "Failed to add block");
        return ok({ block_id: blockId });
      })
  );

  server.tool(
    "update_block",
    "Update specific fields of a block (partial patch). Rich text fields (text, content) must be valid HTML strings.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block_id: z.string().uuid(),
      fields: z.record(z.unknown()),
    },
    async ({ course_id, lesson_id, block_id, fields }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) => {
            if (l.id !== lesson_id) return l;
            return {
              ...l,
              blocks: l.blocks.map((b) =>
                b.id === block_id ? ({ ...b, ...fields, id: b.id, type: b.type } as Block) : b
              ),
            };
          }),
        }));
        if (mutError) return err(mutError, "Failed to update block");
        return ok({ message: "Block updated" });
      })
  );

  server.tool(
    "move_block",
    "Move a block to a new position, optionally to a different lesson. new_position is 1-based within the target lesson.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block_id: z.string().uuid(),
      new_position: z.number().int().positive(),
      target_lesson_id: z.string().uuid().optional(),
    },
    async ({ course_id, lesson_id, block_id, new_position, target_lesson_id }) =>
      withAuth(async (client, userId) => {
        const targetId = target_lesson_id ?? lesson_id;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          // Find and remove block from source lesson
          let blockToMove: Block | undefined;
          const lessonsAfterRemove = course.lessons.map((l) => {
            if (l.id !== lesson_id) return l;
            const idx = l.blocks.findIndex((b) => b.id === block_id);
            if (idx === -1) return l;
            blockToMove = l.blocks[idx];
            return { ...l, blocks: l.blocks.filter((b) => b.id !== block_id) };
          });
          if (!blockToMove) return course;

          // Insert into target lesson at new_position
          const finalLessons = lessonsAfterRemove.map((l) => {
            if (l.id !== targetId) return l;
            const blocks = [...l.blocks];
            const idx = Math.min(new_position - 1, blocks.length);
            blocks.splice(idx, 0, blockToMove!);
            return { ...l, blocks };
          });
          return { ...course, lessons: finalLessons };
        });
        if (mutError) return err(mutError, "Failed to move block");
        return ok({ message: "Block moved" });
      })
  );

  server.tool(
    "delete_block",
    "Remove a block from a lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id, block_id }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: l.blocks.filter((b) => b.id !== block_id) }
          ),
        }));
        if (mutError) return err(mutError, "Failed to delete block");
        return ok({ message: "Block deleted" });
      })
  );
}
```

- [ ] **Step 2: Compile check**

```bash
cd mcp && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mcp/src/tools/blocks.ts
git commit -m "feat(mcp): add block CRUD tools"
```

---

## Task 9: Preview and Review Tools

**Files:**
- Create: `mcp/src/tools/preview.ts`
- Create: `mcp/tests/preview.test.ts`

The preview renderer converts a Course object to a readable HTML string. It doesn't need to be pixel-perfect — just accurate enough for Claude to assess content flow, block variety, and structure.

- [ ] **Step 1: Write failing tests**

```typescript
// mcp/tests/preview.test.ts
import { describe, it, expect } from "vitest";
import { renderCourseToHtml, analyzeCourse } from "../src/tools/preview.js";
import { Course } from "../src/lib/types.js";

const sampleCourse: Course = {
  schemaVersion: 1,
  title: "Fire Safety",
  lessons: [
    {
      id: "l1",
      title: "Introduction",
      blocks: [
        { id: "b1", type: "heading", text: "Welcome" },
        { id: "b2", type: "text", text: "<p>Hello world</p>" },
        { id: "b3", type: "quiz", question: "Q?", options: ["A", "B"], correctIndex: 0 },
      ],
    },
    {
      id: "l2",
      title: "Equipment",
      blocks: [
        { id: "b4", type: "heading", text: "Gear" },
        { id: "b5", type: "image", src: "https://example.com/img.jpg", alt: "gear" },
      ],
    },
  ],
};

describe("renderCourseToHtml", () => {
  it("includes the course title", () => {
    const html = renderCourseToHtml(sampleCourse);
    expect(html).toContain("Fire Safety");
  });

  it("includes all lesson titles", () => {
    const html = renderCourseToHtml(sampleCourse);
    expect(html).toContain("Introduction");
    expect(html).toContain("Equipment");
  });

  it("renders a quiz block", () => {
    const html = renderCourseToHtml(sampleCourse);
    expect(html).toContain("Q?");
    expect(html).toContain("A");
  });

  it("renders an image block", () => {
    const html = renderCourseToHtml(sampleCourse);
    expect(html).toContain("https://example.com/img.jpg");
  });
});

describe("analyzeCourse", () => {
  it("counts lessons and blocks correctly", () => {
    const result = analyzeCourse(sampleCourse);
    expect(result.lesson_count).toBe(2);
    expect(result.block_count).toBe(5);
  });

  it("counts assessments", () => {
    const result = analyzeCourse(sampleCourse);
    expect(result.assessment_count).toBe(1);
  });

  it("flags lesson with no assessment", () => {
    const result = analyzeCourse(sampleCourse);
    const gap = result.gaps.find((g) => g.lesson_id === "l2" && g.type === "no_assessment");
    expect(gap).toBeDefined();
  });

  it("flags lesson with no media", () => {
    const result = analyzeCourse(sampleCourse);
    const gap = result.gaps.find((g) => g.lesson_id === "l1" && g.type === "no_media");
    expect(gap).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd mcp && npm test tests/preview.test.ts
```

- [ ] **Step 3: Create `mcp/src/tools/preview.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { Course, Block } from "../lib/types.js";

// ─── Pure rendering helpers ──────────────────────────────────────────────────

function renderBlock(block: Block): string {
  switch (block.type) {
    case "heading":
      return `<h2 style="font-size:1.4em;margin:1em 0 0.5em">${esc(block.text)}</h2>`;
    case "text":
      return `<div style="margin:0.5em 0">${block.text}</div>`;
    case "image":
      return `<figure style="margin:1em 0"><img src="${esc(block.src)}" alt="${esc(block.alt)}" style="max-width:100%"/><figcaption>${esc(block.alt)}</figcaption></figure>`;
    case "video":
      return `<p style="background:#f0f0f0;padding:0.5em">[Video: ${esc(block.url)}]</p>`;
    case "audio":
      return `<p style="background:#f0f0f0;padding:0.5em">[Audio: ${esc(block.title ?? block.src)}]</p>`;
    case "list":
      const tag = block.style === "numbered" ? "ol" : "ul";
      return `<${tag} style="margin:0.5em 0 0.5em 1.5em">${block.items.map((i) => `<li>${esc(i)}</li>`).join("")}</${tag}>`;
    case "quote":
      return `<blockquote style="border-left:3px solid #ccc;padding-left:1em;margin:1em 0;font-style:italic">${esc(block.text)}${block.cite ? `<footer>— ${esc(block.cite)}</footer>` : ""}</blockquote>`;
    case "callout":
      const colors: Record<string, string> = { info: "#dbeafe", success: "#dcfce7", warning: "#fef9c3", danger: "#fee2e2" };
      return `<div style="background:${colors[block.variant] ?? "#f0f0f0"};padding:1em;margin:1em 0;border-radius:4px">${block.title ? `<strong>${esc(block.title)}</strong><br/>` : ""}${block.text}</div>`;
    case "code":
      return `<pre style="background:#1e1e1e;color:#d4d4d4;padding:1em;margin:1em 0;overflow:auto"><code>${esc(block.code)}</code></pre>`;
    case "quiz":
      return `<div style="background:#f8f8f8;padding:1em;margin:1em 0"><strong>Quiz:</strong> ${esc(block.question)}<ul>${block.options.map((o, i) => `<li>${i === block.correctIndex ? "✓ " : ""}${esc(o)}</li>`).join("")}</ul></div>`;
    case "truefalse":
      return `<div style="background:#f8f8f8;padding:1em;margin:1em 0"><strong>True/False:</strong> ${esc(block.question)} <em>(Answer: ${block.correct ? "True" : "False"})</em></div>`;
    case "shortanswer":
      return `<div style="background:#f8f8f8;padding:1em;margin:1em 0"><strong>Short Answer:</strong> ${esc(block.question)} <em>(Expected: ${esc(block.answer)})</em></div>`;
    case "accordion":
      return `<details style="margin:0.5em 0"><summary style="cursor:pointer;font-weight:bold">Accordion (${block.items.length} sections)</summary><ul>${block.items.map((i) => `<li><strong>${esc(i.title)}</strong>: ${i.content}</li>`).join("")}</ul></details>`;
    case "tabs":
      return `<div style="border:1px solid #ccc;padding:1em;margin:1em 0">[Tabs: ${block.items.map((t) => esc(t.label)).join(" | ")}]</div>`;
    case "divider":
      return `<hr style="margin:1em 0"/>`;
    case "toc":
      return `<div style="background:#f0f0f0;padding:0.5em;margin:1em 0">[Table of Contents — auto-generated]</div>`;
    default:
      return `<p>[Unknown block type]</p>`;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderCourseToHtml(course: Course): string {
  const lessonHtml = course.lessons
    .map(
      (lesson, i) => `
      <section style="margin-bottom:2em;padding:1em;border:1px solid #e0e0e0;border-radius:6px">
        <h1 style="font-size:1.6em;margin:0 0 1em;border-bottom:2px solid #333;padding-bottom:0.25em">
          Lesson ${i + 1}: ${esc(lesson.title)}
        </h1>
        ${lesson.blocks.map(renderBlock).join("\n")}
      </section>`
    )
    .join("\n");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${esc(course.title)}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2em auto;padding:0 1em;line-height:1.6;color:#222}</style>
  </head><body>
    <header style="margin-bottom:2em"><h1 style="font-size:2em">${esc(course.title)}</h1>
    <p>${course.lessons.length} lessons · ${course.lessons.reduce((n, l) => n + l.blocks.length, 0)} blocks</p></header>
    ${lessonHtml}
  </body></html>`;
}

const KNOWLEDGE_TYPES = new Set(["quiz", "truefalse", "shortanswer"]);
const MEDIA_TYPES = new Set(["image", "video", "audio"]);

export function analyzeCourse(course: Course) {
  const block_type_breakdown: Record<string, number> = {};
  let block_count = 0;
  let assessment_count = 0;
  let word_count = 0;
  const gaps: Array<{ type: string; lesson_id: string; message: string }> = [];

  for (const lesson of course.lessons) {
    let hasAssessment = false;
    let hasMedia = false;

    for (const block of lesson.blocks) {
      block_count++;
      block_type_breakdown[block.type] = (block_type_breakdown[block.type] ?? 0) + 1;
      if (KNOWLEDGE_TYPES.has(block.type)) { assessment_count++; hasAssessment = true; }
      if (MEDIA_TYPES.has(block.type)) hasMedia = true;
      if ("text" in block && typeof (block as any).text === "string") {
        word_count += (block as any).text.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
      }
    }

    if (!hasAssessment) gaps.push({ type: "no_assessment", lesson_id: lesson.id, message: `Lesson "${lesson.title}" has no knowledge checks` });
    if (!hasMedia) gaps.push({ type: "no_media", lesson_id: lesson.id, message: `Lesson "${lesson.title}" has no media blocks` });
    if (lesson.blocks.length > 10) gaps.push({ type: "too_long", lesson_id: lesson.id, message: `Lesson "${lesson.title}" has ${lesson.blocks.length} blocks (max recommended: 10)` });
  }

  return {
    lesson_count: course.lessons.length,
    block_count,
    block_type_breakdown,
    assessment_count,
    estimated_read_minutes: Math.max(1, Math.round(word_count / 200)),
    gaps,
  };
}

// ─── MCP tool registration ────────────────────────────────────────────────────

export function registerPreviewTools(server: McpServer) {
  server.tool(
    "preview_course",
    "Render a course to HTML so you can read and assess its content, layout, and flow",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        const html = renderCourseToHtml(data.content as Course);
        return { content: [{ type: "text", text: html }] };
      })
  );

  server.tool(
    "review_course",
    "Analyse a course structure and return lesson/block counts, assessment coverage, estimated read time, and content gaps",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        return ok(analyzeCourse(data.content as Course));
      })
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd mcp && npm test tests/preview.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/preview.ts mcp/tests/preview.test.ts
git commit -m "feat(mcp): add preview and review tools with tests"
```

---

## Task 10: Semantic Tools

**Files:**
- Create: `mcp/src/tools/semantic.ts`

- [ ] **Step 1: Create `mcp/src/tools/semantic.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid, courseSchema, lessonSchema, blockSchema, type Course, type Block } from "../lib/types.js";

function injectIds(course: any): Course {
  return {
    ...course,
    lessons: (course.lessons ?? []).map((l: any) => ({
      ...l,
      id: uid(),
      blocks: (l.blocks ?? []).map((b: any) => ({ ...b, id: uid() })),
    })),
  };
}

function injectLessonIds(lesson: any) {
  return {
    ...lesson,
    id: uid(),
    blocks: (lesson.blocks ?? []).map((b: any) => ({ ...b, id: uid() })),
  };
}

export function registerSemanticTools(server: McpServer) {
  // ── save_course ──────────────────────────────────────────────────────────
  server.tool(
    "save_course",
    "Bulk-save a full course (create new or replace existing). Omit all id fields — they are generated automatically. Pass course_id to replace an existing course.",
    {
      course_json: z.record(z.unknown()),
      course_id: z.string().uuid().optional(),
    },
    async ({ course_json, course_id }) =>
      withAuth(async (client, userId) => {
        const withIds = injectIds(course_json);
        const parsed = courseSchema.safeParse(withIds);
        if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid course");

        if (course_id) {
          // Replace existing
          const { data: existing } = await client.from("courses").select("id").eq("id", course_id).eq("user_id", userId).single();
          if (!existing) return err("course_not_found", `No course with id ${course_id}`);
          await client.from("courses").update({ content: parsed.data, title: parsed.data.title }).eq("id", course_id).eq("user_id", userId);
          return ok({ course_id });
        }

        const { data, error } = await client.from("courses").insert({ user_id: userId, title: parsed.data.title, content: parsed.data, is_public: false }).select("id").single();
        if (error || !data) return err("insert_failed", error?.message ?? "Unknown");
        return ok({ course_id: data.id });
      })
  );

  // ── replace_lesson ────────────────────────────────────────────────────────
  server.tool(
    "replace_lesson",
    "Replace all blocks in a lesson with a new set. Omit id fields from blocks — generated automatically.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      blocks: z.array(z.record(z.unknown())),
    },
    async ({ course_id, lesson_id, blocks }) =>
      withAuth(async (client, userId) => {
        const blocksWithIds = blocks.map((b) => ({ ...b, id: uid() }));
        const validated = blocksWithIds.map((b) => blockSchema.safeParse(b));
        const invalid = validated.find((r) => !r.success);
        if (invalid && !invalid.success) return err("invalid_block_type", invalid.error.issues[0]?.message ?? "Invalid block");

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: validated.map((r) => (r as any).data) }
          ),
        }));
        if (mutError) return err(mutError, "Failed to replace lesson");
        return ok({ message: "Lesson blocks replaced" });
      })
  );

  // ── generate_course ───────────────────────────────────────────────────────
  server.tool(
    "generate_course",
    "Save a fully-drafted course JSON as a new course. Claude should generate the complete course_json before calling this tool.",
    { course_json: z.record(z.unknown()) },
    async ({ course_json }) =>
      withAuth(async (client, userId) => {
        const withIds = injectIds(course_json);
        const parsed = courseSchema.safeParse(withIds);
        if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid course");
        const { data, error } = await client.from("courses").insert({ user_id: userId, title: parsed.data.title, content: parsed.data, is_public: false }).select("id").single();
        if (error || !data) return err("insert_failed", error?.message ?? "Unknown");
        return ok({ course_id: data.id });
      })
  );

  // ── generate_lesson ───────────────────────────────────────────────────────
  server.tool(
    "generate_lesson",
    "Insert a fully-drafted lesson into an existing course. Claude should generate the lesson_json before calling this tool.",
    {
      course_id: z.string().uuid(),
      lesson_json: z.record(z.unknown()),
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, lesson_json, position }) =>
      withAuth(async (client, userId) => {
        const withIds = injectLessonIds(lesson_json);
        const parsed = lessonSchema.safeParse(withIds);
        if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid lesson");
        const lessonId = parsed.data.id;

        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessons = [...course.lessons];
          const idx = position ? Math.min(position - 1, lessons.length) : lessons.length;
          lessons.splice(idx, 0, parsed.data);
          return { ...course, lessons };
        });
        if (mutError) return err(mutError, "Failed to insert lesson");
        return ok({ lesson_id: lessonId });
      })
  );

  // ── generate_quiz_for_lesson ──────────────────────────────────────────────
  server.tool(
    "generate_quiz_for_lesson",
    "Append assessment blocks to a lesson. Claude should read the lesson first (via get_course), generate the blocks, then call this tool.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      blocks: z.array(z.record(z.unknown())),
    },
    async ({ course_id, lesson_id, blocks }) =>
      withAuth(async (client, userId) => {
        const blocksWithIds = blocks.map((b) => ({ ...b, id: uid() }));
        const validated = blocksWithIds.map((b) => blockSchema.safeParse(b));
        const invalid = validated.find((r) => !r.success);
        if (invalid && !invalid.success) return err("invalid_block_type", invalid.error.issues[0]?.message ?? "Invalid block");
        const parsedBlocks = validated.map((r) => (r as any).data) as Block[];
        const blockIds = parsedBlocks.map((b) => b.id);

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: [...l.blocks, ...parsedBlocks] }
          ),
        }));
        if (mutError) return err(mutError, "Failed to append quiz blocks");
        return ok({ block_ids: blockIds });
      })
  );

  // ── rewrite_block ─────────────────────────────────────────────────────────
  server.tool(
    "rewrite_block",
    "Replace a block's content with a rewritten version. Claude should fetch the block first (via get_course), rewrite it, then call this tool with the updated block (no id field needed).",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block_id: z.string().uuid(),
      updated_block: z.record(z.unknown()),
    },
    async ({ course_id, lesson_id, block_id, updated_block }) =>
      withAuth(async (client, userId) => {
        const withId = { ...updated_block, id: block_id };
        const parsed = blockSchema.safeParse(withId);
        if (!parsed.success) return err("invalid_block_type", parsed.error.issues[0]?.message ?? "Invalid block");

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: l.blocks.map((b) => (b.id === block_id ? parsed.data : b)) }
          ),
        }));
        if (mutError) return err(mutError, "Failed to rewrite block");
        return ok({ message: "Block rewritten" });
      })
  );

  // ── rewrite_lesson ────────────────────────────────────────────────────────
  server.tool(
    "rewrite_lesson",
    "Replace all blocks in a lesson with Claude's rewritten version. Claude should fetch the lesson first, rewrite it, then pass the new blocks array here (no id fields needed).",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      blocks: z.array(z.record(z.unknown())),
    },
    async ({ course_id, lesson_id, blocks }) =>
      withAuth(async (client, userId) => {
        const blocksWithIds = blocks.map((b) => ({ ...b, id: uid() }));
        const validated = blocksWithIds.map((b) => blockSchema.safeParse(b));
        const invalid = validated.find((r) => !r.success);
        if (invalid && !invalid.success) return err("invalid_block_type", invalid.error.issues[0]?.message ?? "Invalid block");

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: validated.map((r) => (r as any).data) }
          ),
        }));
        if (mutError) return err(mutError, "Failed to rewrite lesson");
        return ok({ message: "Lesson rewritten" });
      })
  );

  // ── restructure_course ────────────────────────────────────────────────────
  server.tool(
    "restructure_course",
    "Reorder and/or rename lessons. Claude should provide lesson_order as an array of {lesson_id, title} in the desired order. Does not add or remove lessons.",
    {
      course_id: z.string().uuid(),
      lesson_order: z.array(z.object({ lesson_id: z.string().uuid(), title: z.string() })),
    },
    async ({ course_id, lesson_order }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessonMap = new Map(course.lessons.map((l) => [l.id, l]));
          const reordered = lesson_order
            .map(({ lesson_id, title }) => {
              const lesson = lessonMap.get(lesson_id);
              if (!lesson) return null;
              return { ...lesson, title };
            })
            .filter(Boolean) as typeof course.lessons;
          return { ...course, lessons: reordered };
        });
        if (mutError) return err(mutError, "Failed to restructure course");
        return ok({ message: "Course restructured" });
      })
  );
}
```

- [ ] **Step 2: Compile check**

```bash
cd mcp && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mcp/src/tools/semantic.ts
git commit -m "feat(mcp): add semantic/high-level tools"
```

---

## Task 11: Upload Media Tool + Supabase Storage Bucket

**Files:**
- Create: `mcp/src/tools/media.ts`

Before building this tool, the `course-media` storage bucket must exist in Supabase.

- [ ] **Step 1: Create the Supabase Storage bucket**

In Supabase dashboard:
1. Go to **Storage** → **New bucket**
2. Name: `course-media`
3. Public: **Yes** (so uploaded URLs are publicly accessible)
4. Click **Create bucket**

- [ ] **Step 2: Create `mcp/src/tools/media.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err, getStorageClient } from "../lib/supabase.js";
import * as fs from "fs";
import * as path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
};

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function registerMediaTools(server: McpServer) {
  server.tool(
    "upload_media",
    "Upload a media file from your Mac to TideLearn's storage. Returns a public URL you can use in image/video/audio blocks.",
    {
      file_path: z.string().describe("Absolute path to the file on your Mac"),
      course_id: z.string().uuid().describe("The course this media belongs to, used to organise storage"),
    },
    async ({ file_path, course_id }) =>
      withAuth(async (_client, userId) => {
        // Validate file exists
        if (!fs.existsSync(file_path)) {
          return err("file_not_found", `No file at path: ${file_path}`);
        }

        // Validate size
        const { size } = fs.statSync(file_path);
        if (size > MAX_SIZE_BYTES) {
          return err("file_too_large", `File is ${Math.round(size / 1024 / 1024)}MB. Maximum is 50MB.`);
        }

        // Validate type
        const ext = path.extname(file_path).toLowerCase().slice(1);
        const contentType = ALLOWED_TYPES[ext];
        if (!contentType) {
          return err("unsupported_file_type", `File type .${ext} is not supported. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`);
        }

        // Upload to Supabase Storage
        const filename = `${Date.now()}-${path.basename(file_path)}`;
        const storagePath = `${userId}/${course_id}/${filename}`;
        const fileBuffer = fs.readFileSync(file_path);

        const storage = getStorageClient();
        const { error } = await storage.storage
          .from("course-media")
          .upload(storagePath, fileBuffer, { contentType, upsert: false });

        if (error) return err("storage_error", error.message);

        const { data: urlData } = storage.storage.from("course-media").getPublicUrl(storagePath);
        return ok({ url: urlData.publicUrl, path: storagePath });
      })
  );
}
```

- [ ] **Step 3: Compile check**

```bash
cd mcp && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add mcp/src/tools/media.ts
git commit -m "feat(mcp): add upload_media tool"
```

---

## Task 12: MCP Server Entry Point

**Files:**
- Create: `mcp/src/index.ts`

Wire all tools together into the MCP server.

- [ ] **Step 1: Create `mcp/src/index.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCourseTools } from "./tools/courses.js";
import { registerLessonTools } from "./tools/lessons.js";
import { registerBlockTools } from "./tools/blocks.js";
import { registerSemanticTools } from "./tools/semantic.js";
import { registerPreviewTools } from "./tools/preview.js";
import { registerMediaTools } from "./tools/media.js";

const server = new McpServer({
  name: "tidelearn",
  version: "1.0.0",
});

registerCourseTools(server);
registerLessonTools(server);
registerBlockTools(server);
registerSemanticTools(server);
registerPreviewTools(server);
registerMediaTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Full build**

```bash
cd mcp && npm run build
```

Expected: `dist/index.js` created, no errors.

- [ ] **Step 3: Commit**

```bash
git add mcp/src/index.ts
git commit -m "feat(mcp): wire MCP server entry point — all 27 tools registered"
```

---

## Task 13: Claude Desktop Integration

- [ ] **Step 1: Copy `.env.example` to `.env` and fill in values**

```bash
cp mcp/.env.example mcp/.env
```

Edit `mcp/.env`:
```
SUPABASE_URL=https://rljldeobjtgoqttuxhsf.supabase.co
SUPABASE_ANON_KEY=<from Supabase dashboard → Project Settings → API → anon/public>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Project Settings → API → service_role>
```

- [ ] **Step 2: Add redirect URL to Supabase dashboard**

In Supabase dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add: `http://localhost:54399/callback`
3. Save

- [ ] **Step 3: Configure Claude Desktop**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (create if missing):

```json
{
  "mcpServers": {
    "tidelearn": {
      "command": "node",
      "args": ["/Users/theonavarro/TideLearn/mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://rljldeobjtgoqttuxhsf.supabase.co",
        "SUPABASE_ANON_KEY": "<paste anon key>",
        "SUPABASE_SERVICE_ROLE_KEY": "<paste service role key>"
      }
    }
  }
}
```

- [ ] **Step 4: Restart Claude Desktop**

Quit Claude Desktop fully (Cmd+Q), then reopen it. The TideLearn MCP should appear in the tools panel.

- [ ] **Step 5: Smoke test — login flow**

In a new Claude Desktop conversation, type:
```
list my TideLearn courses
```

Expected: Claude calls `list_courses`, MCP detects no session, returns a login URL. Claude displays the URL. Click it, log in, close the browser tab. Ask Claude to try again.

Expected on second attempt: a JSON array of courses (or an empty array `[]` if no courses exist yet).

- [ ] **Step 6: Smoke test — full round trip**

```
Create a 2-lesson course called "Test MCP" with a heading and text block in each lesson
```

Expected: Claude calls `generate_course` with a complete course JSON, tool returns `{course_id: "..."}`. Open TideLearn in the browser — the course should be visible.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(mcp): complete TideLearn MCP server — 27 tools, OAuth, Keychain, storage"
```

---

## Run All Tests

```bash
cd mcp && npm test
```

Expected: all tests pass. Test files: `uid.test.ts`, `mutate.test.ts`, `preview.test.ts`, `courses.test.ts`
