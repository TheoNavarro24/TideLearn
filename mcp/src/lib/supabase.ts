import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  loadSession,
  saveSession,
  isSessionValid,
  refreshSession,
  buildLoginUrl,
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
    Buffer.from(auth.session!.access_token.split(".")[1], "base64url").toString()
  );
  const userId: string = payload.sub;

  return handler(auth.client!, userId);
}

/** Service role client for storage operations only */
export function getStorageClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}
