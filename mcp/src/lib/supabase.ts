import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  loadSession,
  isSessionValid,
  refreshSession,
  type StoredSession,
} from "./auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const APP_URL = process.env.APP_URL ?? "https://tidelearn.com";

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

export { SUPABASE_URL, SUPABASE_ANON_KEY };

/**
 * Get an authenticated Supabase client for the current user.
 * Returns null if no valid session exists.
 */
export async function getAuthenticatedClient(): Promise<
  | { client: SupabaseClient; session: StoredSession }
  | null
> {
  let session = await loadSession();

  if (session && !isSessionValid(session)) {
    try {
      session = await refreshSession(SUPABASE_URL, SUPABASE_ANON_KEY, session);
    } catch {
      session = null;
    }
  }

  if (!session) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${session.access_token}` },
    },
  });

  return { client, session };
}

/**
 * Middleware wrapper for all tool handlers.
 * If not logged in, tells Claude to call tidelearn_login first.
 */
export async function withAuth(
  handler: (client: SupabaseClient, userId: string) => Promise<ToolResult>
): Promise<ToolResult> {
  const auth = await getAuthenticatedClient();

  if (!auth) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            code: "auth_required",
            message: "You are not logged in to TideLearn. Please call the tidelearn_login tool to open a browser login page.",
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

  return handler(auth.client, userId);
}

/** Service role client for storage operations only */
export function getStorageClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}
