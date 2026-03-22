# MCP Hosted Auth & Transport — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local-only login server with MCP-standard OAuth 2.0 PKCE, enabling the TideLearn MCP to run as a hosted SSE server that works with any MCP client (Claude Desktop, Claude Code, ChatGPT). Also add a `get_upload_url` tool for media upload that works in both local and remote contexts.

**Prerequisites:** Domain and hosting infrastructure must be live. This plan assumes the MCP server is being deployed as an SSE endpoint (e.g. `https://mcp.tidelearn.com/sse`). The local stdio version continues to work in parallel during transition.

**Architecture:**
- The MCP server exposes standard OAuth 2.0 metadata and handles the authorization code + PKCE flow per spec.
- The MCP client (Claude/ChatGPT) generates the PKCE verifier/challenge pair — the server never generates its own. The server stores the client's `code_challenge` and verifies the client's `code_verifier` at the token exchange step.
- After Supabase login, the frontend POSTs the Supabase session token to a server-side `/finalize-auth` endpoint (never in a URL query string). The MCP server stores it in the `mcp_sessions` table and issues an opaque MCP access token.
- `withAuth` uses `AsyncLocalStorage` for request-scoped user context (safe for concurrent SSE connections — no global mutable state).
- The SSE transport and `/messages` POST handler are paired per connection using a connection map.
- Session state lives in Supabase `mcp_sessions`; no filesystem session file needed in hosted mode.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, Supabase, Hono, Node.js `AsyncLocalStorage`. Stdio entry point remains for local use.

---

## Background: Correct PKCE OAuth Flow

```
MCP Client                    MCP Server                  User's Browser
    |                              |                              |
    |-- GET /.well-known/... ----> |                              |
    |<- { authorization_endpoint }|                              |
    |                              |                              |
    | (generates verifier+challenge locally)                      |
    |-- GET /authorize?code_challenge=... --> redirect ---------->|
    |                              |              (Supabase login)|
    |                              |<-- POST /finalize-auth ----  |
    |                              |    { state, supabase_token } |
    |                              |-- stores session, issues code|
    |                              |--- redirect to client -----> |
    |<-- GET redirect_uri?code=... |                              |
    |-- POST /token { code, code_verifier } ->                    |
    |          (server verifies SHA256(verifier)==challenge)       |
    |<- { access_token } ---------|                              |
    |-- GET /sse (Bearer token) -> |                              |
```

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_mcp_sessions.sql` | New — `mcp_sessions` table with user_id, mcp_token, supabase_token, expires_at |
| `mcp/src/lib/oauth.ts` | New — PKCE helpers, token generation, `isTokenExpired` |
| `mcp/src/lib/session.ts` | New — Supabase-backed session CRUD |
| `mcp/src/lib/request-context.ts` | New — `AsyncLocalStorage` for per-request userId |
| `mcp/src/server/http.ts` | New — Hono HTTP server: OAuth metadata, /authorize, /finalize-auth, /token, /sse, /messages |
| `mcp/src/server/stdio.ts` | New — extract existing stdio entry point |
| `mcp/src/tools/media.ts` | Add `get_upload_url` tool |
| `mcp/src/index.ts` | Modify — transport switching via `MCP_TRANSPORT` env var |
| `mcp/src/lib/supabase.ts` | Modify — `withAuth` uses `AsyncLocalStorage` context in hosted mode |
| `mcp/tests/oauth.test.ts` | New — PKCE round-trip and token expiry tests |
| `mcp/tests/session.test.ts` | New — expiry logic tests |

---

### Task 1: Create Supabase `mcp_sessions` table

**Files:**
- Create: `supabase/migrations/YYYYMMDD_mcp_sessions.sql` (use today's date)

- [ ] **Step 1: Write the migration**

```sql
-- MCP session store for hosted OAuth tokens
create table if not exists mcp_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  mcp_token           text not null unique,         -- opaque token given to MCP client
  supabase_token      text not null,                -- Supabase access token for this user
  expires_at          timestamptz not null,
  created_at          timestamptz not null default now()
);

create index mcp_sessions_mcp_token_idx on mcp_sessions (mcp_token);
create index mcp_sessions_expires_at_idx on mcp_sessions (expires_at);

-- RLS: service role only
alter table mcp_sessions enable row level security;
```

- [ ] **Step 2: Apply migration**

```bash
supabase db push
```
Expected: migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add mcp_sessions table for hosted OAuth"
```

---

### Task 2: PKCE helpers and token utilities

**Files:**
- Create: `mcp/src/lib/oauth.ts`
- Test: `mcp/tests/oauth.test.ts`

- [ ] **Step 1: Write failing tests**

Create `mcp/tests/oauth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  generateMcpToken,
  isTokenExpired,
  verifyPkce,
} from "../src/lib/oauth.js";

describe("generateMcpToken", () => {
  it("returns a non-empty string", () => {
    const t = generateMcpToken();
    expect(typeof t).toBe("string");
    expect(t.length).toBeGreaterThan(20);
  });

  it("each call returns a different token", () => {
    expect(generateMcpToken()).not.toBe(generateMcpToken());
  });
});

describe("isTokenExpired", () => {
  it("returns true for a timestamp in the past", () => {
    const past = new Date(Date.now() - 5000).toISOString();
    expect(isTokenExpired(past)).toBe(true);
  });

  it("returns true for a timestamp within the 30s grace window", () => {
    // 20 seconds in the future — within the 30s buffer, so treated as expired
    const soon = new Date(Date.now() + 20_000).toISOString();
    expect(isTokenExpired(soon)).toBe(true);
  });

  it("returns false for a timestamp well in the future", () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    expect(isTokenExpired(future)).toBe(false);
  });
});

describe("verifyPkce", () => {
  it("returns true when verifier matches challenge", async () => {
    // Test vector: known verifier → known S256 challenge
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    // SHA256(verifier as ASCII) → base64url
    const { createHash } = await import("crypto");
    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");
    const result = await verifyPkce(verifier, challenge);
    expect(result).toBe(true);
  });

  it("returns false when verifier does not match challenge", async () => {
    const result = await verifyPkce("wrong-verifier", "some-challenge");
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — confirm failure**

```bash
cd mcp && npm test -- tests/oauth.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `mcp/src/lib/oauth.ts`**

```ts
import { randomBytes, createHash } from "crypto";

/** Generate a random opaque MCP session token (hex string). */
export function generateMcpToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Returns true if the ISO timestamp is expired or within 30 seconds of expiry.
 * The 30s buffer prevents issuing tool calls against a token that would expire
 * mid-flight.
 */
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now() + 30_000;
}

/**
 * Verify a PKCE code_verifier against a stored code_challenge (S256 method).
 * Returns true if SHA256(verifier) encoded as base64url equals the challenge.
 */
export async function verifyPkce(codeVerifier: string, codeChallenge: string): Promise<boolean> {
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  return computed === codeChallenge;
}

/** Default MCP token TTL: 8 hours in milliseconds. */
export const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd mcp && npm test -- tests/oauth.test.ts
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/lib/oauth.ts mcp/tests/oauth.test.ts
git commit -m "feat(mcp): PKCE verifier and token helpers"
```

---

### Task 3: Supabase-backed session store

**Files:**
- Create: `mcp/src/lib/session.ts`
- Test: `mcp/tests/session.test.ts`

- [ ] **Step 1: Write tests**

Create `mcp/tests/session.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isTokenExpired } from "../src/lib/oauth.js";

// Session store depends on Supabase — we unit-test only the expiry logic here.
// Integration tests for createSession / validateToken require a live DB.
describe("session token expiry", () => {
  it("expired session is detected", () => {
    const expiredAt = new Date(Date.now() - 5000).toISOString();
    expect(isTokenExpired(expiredAt)).toBe(true);
  });

  it("valid session (1 hour ahead) is not expired", () => {
    const futureAt = new Date(Date.now() + 3_600_000).toISOString();
    expect(isTokenExpired(futureAt)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — confirm pass**

```bash
cd mcp && npm test -- tests/session.test.ts
```
Expected: pass.

- [ ] **Step 3: Create `mcp/src/lib/session.ts`**

```ts
import { createClient } from "@supabase/supabase-js";
import { isTokenExpired, generateMcpToken, TOKEN_TTL_MS } from "./oauth.js";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function db() {
  return createClient(supabaseUrl, serviceRoleKey);
}

export type SessionData = {
  userId: string;
  supabaseToken: string;
};

/**
 * Create a new MCP session for a user.
 * Stores the Supabase access token so withAuth can build an authenticated client.
 * Returns the opaque MCP token to give to the MCP client.
 */
export async function createSession(userId: string, supabaseToken: string): Promise<string> {
  const mcpToken = generateMcpToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const { error } = await db().from("mcp_sessions").insert({
    user_id: userId,
    mcp_token: mcpToken,
    supabase_token: supabaseToken,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return mcpToken;
}

/**
 * Validate an MCP token. Returns session data if valid, null if expired or unknown.
 * Deletes the session row on expiry.
 */
export async function validateToken(mcpToken: string): Promise<SessionData | null> {
  const { data, error } = await db()
    .from("mcp_sessions")
    .select("user_id, supabase_token, expires_at")
    .eq("mcp_token", mcpToken)
    .single();

  if (error || !data) return null;

  if (isTokenExpired(data.expires_at)) {
    await db().from("mcp_sessions").delete().eq("mcp_token", mcpToken);
    return null;
  }

  return { userId: data.user_id, supabaseToken: data.supabase_token };
}

/** Revoke an MCP session. */
export async function revokeSession(mcpToken: string): Promise<void> {
  await db().from("mcp_sessions").delete().eq("mcp_token", mcpToken);
}
```

- [ ] **Step 4: Build check**

```bash
cd mcp && npm run build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/lib/session.ts mcp/tests/session.test.ts
git commit -m "feat(mcp): Supabase-backed session store with supabase_token field"
```

---

### Task 4: Per-request context using AsyncLocalStorage

**Files:**
- Create: `mcp/src/lib/request-context.ts`

This replaces the unsafe global mutable state with Node.js `AsyncLocalStorage`, which is request-scoped and safe for concurrent connections.

- [ ] **Step 1: Create `mcp/src/lib/request-context.ts`**

```ts
import { AsyncLocalStorage } from "async_hooks";

export type RequestContext = {
  userId: string;
  supabaseToken: string;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Run a handler with a request-scoped context.
 * All async code within the handler (including tool calls) can read the context
 * via requestContext.getStore() — safely isolated per concurrent request.
 */
export function withRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContext.run(ctx, fn);
}

/** Get the current request context, or null if not in a request scope. */
export function getRequestContext(): RequestContext | null {
  return requestContext.getStore() ?? null;
}
```

- [ ] **Step 2: Build check**

```bash
cd mcp && npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mcp/src/lib/request-context.ts
git commit -m "feat(mcp): AsyncLocalStorage request context for concurrent-safe auth"
```

---

### Task 5: Update `withAuth` to support both modes

**Files:**
- Modify: `mcp/src/lib/supabase.ts`

- [ ] **Step 1: Update `withAuth`**

Add import at the top of `supabase.ts`:
```ts
import { getRequestContext } from "./request-context.js";
```

Replace the `withAuth` function:

```ts
export async function withAuth(
  handler: (client: SupabaseClient, userId: string) => Promise<ToolResult>
): Promise<ToolResult> {
  // Hosted SSE mode: context injected per-request by the HTTP server
  const ctx = getRequestContext();
  if (ctx) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${ctx.supabaseToken}` } },
    });
    return handler(client, ctx.userId);
  }

  // Local stdio mode: read from session file
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          code: "auth_required",
          message: "You are not logged in to TideLearn. Please call the tidelearn_login tool to open a browser login page.",
        }),
      }],
    };
  }

  const payload = JSON.parse(
    Buffer.from(auth.session.access_token.split(".")[1], "base64url").toString()
  );
  return handler(auth.client, payload.sub);
}
```

- [ ] **Step 2: Build and test**

```bash
cd mcp && npm run build && npm test
```
Expected: all pass. Existing behaviour unchanged (stdio path still works).

- [ ] **Step 3: Commit**

```bash
git add mcp/src/lib/supabase.ts
git commit -m "feat(mcp): withAuth uses AsyncLocalStorage context in hosted mode"
```

---

### Task 6: HTTP server with correct OAuth 2.0 PKCE and SSE

**Files:**
- Create: `mcp/src/server/http.ts`

Key correctness points:
- `/authorize` stores the **client's** `code_challenge` (not a server-generated verifier)
- `/token` receives the client's `code_verifier`, computes SHA256, compares to stored challenge
- `/finalize-auth` accepts a POST with `{ state, supabase_access_token }` — token never in URL
- Per-connection transport map enables `/messages` POST to route to the right SSE connection; each POST re-enters `withRequestContext` with the stored session context
- `pendingAuth` entries expire after 10 minutes

- [ ] **Step 1: Add Hono dependency**

```bash
cd mcp && npm install hono @hono/node-server
```

- [ ] **Step 2: Create `mcp/src/server/http.ts` with the following content**

```ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createClient } from "@supabase/supabase-js";
import { createSession } from "../lib/session.js";
import { verifyPkce } from "../lib/oauth.js";
import { withRequestContext } from "../lib/request-context.js";
import { validateToken } from "../lib/session.js";
import { randomBytes } from "crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const APP_URL = process.env.APP_URL ?? "https://tidelearn.com";
const MCP_BASE_URL = process.env.MCP_BASE_URL!;

if (!MCP_BASE_URL) throw new Error("MCP_BASE_URL env var required for hosted mode");

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000; // 10 minutes

type PendingAuth = {
  codeChallenge: string;   // the CLIENT's code_challenge — we verify against this
  redirectUri: string;
  clientId: string;
  createdAt: number;
};

type PendingCode = {
  mcpToken: string;        // the MCP token we'll return
  redirectUri: string;
  codeChallenge: string;   // stored so /token can verify PKCE
  createdAt: number;
};

// In-flight auth state — cleaned up on use or expiry
const pendingAuth = new Map<string, PendingAuth>();
const pendingCodes = new Map<string, PendingCode>();

function cleanupExpired() {
  const now = Date.now();
  for (const [k, v] of pendingAuth) {
    if (now - v.createdAt > PENDING_AUTH_TTL_MS) pendingAuth.delete(k);
  }
  for (const [k, v] of pendingCodes) {
    if (now - v.createdAt > PENDING_AUTH_TTL_MS) pendingCodes.delete(k);
  }
}

// Per-connection state — keyed by connection ID
// Stores the transport AND the session context, so /messages can re-enter
// AsyncLocalStorage (which is scoped to a call stack, not a connection lifetime)
type ActiveConnection = { transport: SSEServerTransport; context: RequestContext };
const activeTransports = new Map<string, ActiveConnection>();

export function createHttpServer(mcpServer: McpServer) {
  const app = new Hono();

  // ── OAuth 2.0 Authorization Server Metadata ──────────────────────────────
  app.get("/.well-known/oauth-authorization-server", (c) => {
    return c.json({
      issuer: MCP_BASE_URL,
      authorization_endpoint: `${MCP_BASE_URL}/authorize`,
      token_endpoint: `${MCP_BASE_URL}/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
    });
  });

  // ── Authorization endpoint ─────────────────────────────────────────────
  // Receives: redirect_uri, client_id, state, code_challenge, code_challenge_method
  // Stores code_challenge (never generates its own verifier).
  // Redirects user to TideLearn's login page.
  app.get("/authorize", (c) => {
    cleanupExpired();
    const { redirect_uri, client_id, state, code_challenge, code_challenge_method } = c.req.query();

    if (!redirect_uri || !client_id || !state || !code_challenge) {
      return c.text("Missing required parameters: redirect_uri, client_id, state, code_challenge", 400);
    }
    if (code_challenge_method && code_challenge_method !== "S256") {
      return c.text("Only S256 code_challenge_method is supported", 400);
    }

    // Store the CLIENT's code_challenge — we'll verify it at /token
    pendingAuth.set(state, { codeChallenge: code_challenge, redirectUri: redirect_uri, clientId: client_id, createdAt: Date.now() });

    // Redirect to TideLearn's login page, passing callback URL and state
    const loginUrl = new URL(`${APP_URL}/mcp-login`);
    loginUrl.searchParams.set("callback", `${MCP_BASE_URL}/finalize-auth`);
    loginUrl.searchParams.set("state", state);

    return c.redirect(loginUrl.toString());
  });

  // ── Finalize auth — receives Supabase token via POST (never in URL) ────
  // Called by the /mcp-login frontend page after successful Supabase auth.
  // Body: JSON { state: string, supabase_access_token: string }
  app.post("/finalize-auth", async (c) => {
    cleanupExpired();
    const body = await c.req.json().catch(() => null);
    if (!body?.state || !body?.supabase_access_token) {
      return c.json({ error: "Missing state or supabase_access_token" }, 400);
    }

    const { state, supabase_access_token } = body;
    const pending = pendingAuth.get(state);
    if (!pending) return c.json({ error: "Unknown or expired state" }, 400);
    pendingAuth.delete(state);

    // Validate the Supabase token and get user identity
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${supabase_access_token}` } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return c.json({ error: "Invalid Supabase token" }, 401);

    // Create MCP session — stores supabase_token for later use in withAuth
    const mcpToken = await createSession(user.id, supabase_access_token);

    // Issue a one-time auth code (exchanged for the MCP token at /token)
    const code = randomBytes(16).toString("hex");
    pendingCodes.set(code, {
      mcpToken,
      redirectUri: pending.redirectUri,
      codeChallenge: pending.codeChallenge,  // stored for PKCE verification at /token
      createdAt: Date.now(),
    });

    // Return the redirect URL to the frontend (it navigates there)
    const redirectUrl = new URL(pending.redirectUri);
    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("state", state);
    return c.json({ redirect_to: redirectUrl.toString() });
  });

  // ── Token endpoint ────────────────────────────────────────────────────────
  // Receives: grant_type, code, code_verifier, redirect_uri
  // Verifies SHA256(code_verifier) == stored code_challenge (PKCE enforcement)
  app.post("/token", async (c) => {
    const body = await c.req.parseBody();
    const { grant_type, code, code_verifier } = body;

    if (grant_type !== "authorization_code") {
      return c.json({ error: "unsupported_grant_type" }, 400);
    }
    if (!code || !code_verifier) {
      return c.json({ error: "Missing code or code_verifier" }, 400);
    }

    const pending = pendingCodes.get(code as string);
    if (!pending) return c.json({ error: "invalid_grant" }, 400);

    // PKCE verification: SHA256(code_verifier) must equal stored code_challenge
    const challengeMatches = await verifyPkce(code_verifier as string, pending.codeChallenge);
    if (!challengeMatches) {
      pendingCodes.delete(code as string);
      return c.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, 400);
    }

    pendingCodes.delete(code as string);

    return c.json({
      access_token: pending.mcpToken,
      token_type: "bearer",
      expires_in: 8 * 3600,
    });
  });

  // ── SSE connection ────────────────────────────────────────────────────────
  // Validates bearer token, sets request context, establishes SSE transport.
  app.get("/sse", async (c) => {
    const authHeader = c.req.header("Authorization");
    const mcpToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (!mcpToken) return c.text("Unauthorized", 401);

    const session = await validateToken(mcpToken);
    if (!session) return c.text("Unauthorized — token invalid or expired", 401);

    const connectionId = randomBytes(8).toString("hex");
    const transport = new SSEServerTransport(`/messages?cid=${connectionId}`, c.res as any);
    const context: RequestContext = { userId: session.userId, supabaseToken: session.supabaseToken };
    // Store context alongside transport — /messages handler (a separate call stack)
    // must re-enter withRequestContext itself; AsyncLocalStorage does not survive
    // across separate HTTP requests.
    activeTransports.set(connectionId, { transport, context });

    transport.onclose = () => activeTransports.delete(connectionId);

    await mcpServer.connect(transport);
    return new Response(null);
  });

  // ── Messages POST — routes JSON-RPC from client to correct SSE transport ──
  // Re-enters the AsyncLocalStorage context so withAuth sees the right userId
  // for this connection (each POST is a separate call stack).
  app.post("/messages", async (c) => {
    const cid = c.req.query("cid");
    if (!cid) return c.text("Missing connection id", 400);

    const conn = activeTransports.get(cid);
    if (!conn) return c.text("No active SSE connection for this id", 404);

    const body = await c.req.text();
    await withRequestContext(conn.context, async () => {
      await conn.transport.handlePostMessage(body, c.res as any);
    });
    return new Response(null);
  });

  return app;
}

export function startHttpServer(mcpServer: McpServer, port = 3001) {
  const app = createHttpServer(mcpServer);
  serve({ fetch: app.fetch, port });
  console.error(`TideLearn MCP server (hosted) running on http://0.0.0.0:${port}`);
}
```

- [ ] **Step 3: Build check**

```bash
cd mcp && npm run build
```
Expected: no errors. (If `SSEServerTransport` import path differs in your SDK version, check `node_modules/@modelcontextprotocol/sdk/` for the correct path.)

- [ ] **Step 4: Run tests**

```bash
cd mcp && npm test
```
Expected: all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/server/http.ts
git commit -m "feat(mcp): HTTP server with correct OAuth 2.0 PKCE, SSE transport, and /messages handler"
```

---

### Task 7: Extract stdio entry point and add transport switching

**Files:**
- Create: `mcp/src/server/stdio.ts`
- Modify: `mcp/src/index.ts`

- [ ] **Step 1: Create `mcp/src/server/stdio.ts`**

```ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function startStdioServer(server: McpServer) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

- [ ] **Step 2: Update `mcp/src/index.ts`**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerCourseTools } from "./tools/courses.js";
import { registerLessonTools } from "./tools/lessons.js";
import { registerBlockTools } from "./tools/blocks.js";
import { registerSemanticTools } from "./tools/semantic.js";
import { registerPreviewTools } from "./tools/preview.js";
import { registerMediaTools } from "./tools/media.js";
import { registerAssessmentTools } from "./tools/assessment.js";
import { registerInstructionsResource } from "./resources/instructions.js";
import { startStdioServer } from "./server/stdio.js";
import { startHttpServer } from "./server/http.js";

const server = new McpServer(
  { name: "tidelearn", version: "2.0.0" },
  {
    instructions: `TideLearn MCP — course authoring tools for eLearning professionals.
Read the tidelearn://instructions resource before calling any other tools.`,
  }
);

registerInstructionsResource(server);
registerAuthTools(server);
registerCourseTools(server);
registerLessonTools(server);
registerBlockTools(server);
registerSemanticTools(server);
registerPreviewTools(server);
registerMediaTools(server);
registerAssessmentTools(server);

const transport = process.env.MCP_TRANSPORT ?? "stdio";

if (transport === "http") {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  startHttpServer(server, port);
} else {
  await startStdioServer(server);
}
```

- [ ] **Step 3: Build and test**

```bash
cd mcp && npm run build && npm test
```
Expected: all pass. Stdio mode unchanged.

- [ ] **Step 4: Commit**

```bash
git add mcp/src/server/stdio.ts mcp/src/index.ts
git commit -m "feat(mcp): transport switching — stdio default, http via MCP_TRANSPORT=http"
```

---

### Task 8: Add `get_upload_url` tool

**Files:**
- Modify: `mcp/src/tools/media.ts`

- [ ] **Step 1: Add tool after `upload_media`**

```ts
server.tool(
  "get_upload_url",
  `Get a pre-signed upload URL for a media file. Use this in hosted mode (or whenever you cannot read the local filesystem directly).

Returns:
- upload_url: the user must PUT their file to this URL with the correct Content-Type header
- public_url: use this in image/video/audio/document blocks after the upload is confirmed
- content_type: the expected Content-Type header for the PUT request

Workflow:
1. Call this tool to get upload_url and public_url
2. Tell the user: "Please upload your file to this URL: {upload_url} using a PUT request with Content-Type: {content_type}"
3. Once the user confirms the upload, use public_url in the relevant block

Supported extensions: jpg, jpeg, png, gif, webp, mp4, webm, mp3, wav, ogg, pdf, docx, xlsx, pptx`,
  {
    filename: z.string().describe("Original filename including extension, e.g. photo.jpg or report.pdf"),
    course_id: z.string().uuid(),
  },
  async ({ filename, course_id }) =>
    withAuth(async (_client, userId) => {
      const contentType = getMimeType(filename);
      if (!contentType) {
        return err("unsupported_type", `Unsupported file type. Supported extensions: ${SUPPORTED_EXTENSIONS.join(", ")}`);
      }

      const storagePath = `${userId}/${course_id}/${Date.now()}-${filename}`;
      const storage = getStorageClient();

      const { data, error } = await storage.storage
        .from("course-media")
        .createSignedUploadUrl(storagePath);

      if (error || !data) {
        return err("storage_error", error?.message ?? "Failed to generate upload URL");
      }

      const { data: urlData } = storage.storage.from("course-media").getPublicUrl(storagePath);

      return ok({
        upload_url: data.signedUrl,
        public_url: urlData.publicUrl,
        content_type: contentType,
      });
    })
);
```

Note: `getMimeType`, `SUPPORTED_EXTENSIONS`, and `getStorageClient` are already imported at the top of `media.ts`. Verify the imports and add any missing ones.

- [ ] **Step 2: Build and test**

```bash
cd mcp && npm run build && npm test
```
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add mcp/src/tools/media.ts
git commit -m "feat(mcp): add get_upload_url for hosted/remote media via pre-signed URLs"
```

---

### Integration Note: Frontend `/mcp-login` page

The OAuth flow requires a new page at `/mcp-login` in the TideLearn app (`src/pages/McpLogin.tsx`). Its responsibilities:

1. Read `?callback=<url>&state=<state>` from the URL
2. If user is already logged in (Supabase session exists), proceed immediately
3. Otherwise, show TideLearn's standard auth UI (Google + email/password)
4. After successful login, get the Supabase session `access_token`
5. POST to `{callback}` (the MCP server's `/finalize-auth`) with body `{ state, supabase_access_token }`
6. On success, redirect the browser to the `redirect_to` URL returned in the response

The token is **never** placed in a URL query string — it goes in a JSON POST body.

This page needs to be added as a separate frontend task coordinated with this plan.

---

### Environment Variables for Hosted Deployment

```bash
MCP_TRANSPORT=http                        # enables HTTP/SSE mode (default: stdio)
PORT=3001                                  # HTTP server port
MCP_BASE_URL=https://mcp.tidelearn.com   # public base URL of this MCP server
APP_URL=https://tidelearn.com            # TideLearn app URL (for login redirect)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

### Final: End-to-end smoke tests

- [ ] **Confirm OAuth metadata endpoint**

```bash
cd mcp && MCP_TRANSPORT=http MCP_BASE_URL=http://localhost:3001 PORT=3001 npm run dev &
sleep 2
curl http://localhost:3001/.well-known/oauth-authorization-server | jq .
```
Expected: JSON with `authorization_endpoint`, `token_endpoint`, `code_challenge_methods_supported: ["S256"]`.

- [ ] **Confirm SSE requires auth**

```bash
curl http://localhost:3001/sse
```
Expected: `401 Unauthorized`.

- [ ] **Confirm stdio mode still works**

```bash
cd mcp && echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm run dev 2>/dev/null | head -1
```
Expected: JSON with tool list.

- [ ] **Kill background server, run full test suite**

```bash
pkill -f "npm run dev"; cd mcp && npm test
```
Expected: all pass.

- [ ] **Final commit**

```bash
git add .
git commit -m "feat(mcp): complete hosted SSE server with OAuth 2.0 PKCE, AsyncLocalStorage context, and get_upload_url"
```
