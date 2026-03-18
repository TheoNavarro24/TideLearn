import { createClient, SupabaseClient } from "@supabase/supabase-js";
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
): Promise<{ url: string; client: SupabaseClient }> {
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
  client: SupabaseClient,
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
