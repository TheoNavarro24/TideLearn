import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const SESSION_FILE = join(homedir(), ".tidelearn-session.json");

export type StoredSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp seconds
};

/** Read session from file. Returns null if not found. */
export async function loadSession(): Promise<StoredSession | null> {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_FILE, "utf-8")) as StoredSession;
  } catch {
    return null;
  }
}

/** Persist session to file. */
export async function saveSession(session: StoredSession): Promise<void> {
  writeFileSync(SESSION_FILE, JSON.stringify(session), { mode: 0o600 });
}

/** Remove session file (logout). */
export async function clearSession(): Promise<void> {
  if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE);
}

/** Returns true if the stored session is still valid (not expired). */
export function isSessionValid(session: StoredSession): boolean {
  // Add a 60-second buffer before expiry
  return session.expires_at > Math.floor(Date.now() / 1000) + 60;
}

/**
 * Sign in with email and password.
 * Saves the session to ~/.tidelearn-session.json and returns it.
 */
export async function signInWithEmailPassword(
  supabaseUrl: string,
  supabaseAnonKey: string,
  email: string,
  password: string
): Promise<StoredSession> {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw new Error(error?.message ?? "Sign-in failed");
  }

  const session: StoredSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };

  await saveSession(session);
  return session;
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
