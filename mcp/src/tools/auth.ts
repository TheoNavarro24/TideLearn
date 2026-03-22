import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "http";
import { createClient } from "@supabase/supabase-js";
import { saveSession, clearSession } from "../lib/auth.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, ok, err } from "../lib/supabase.js";

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TideLearn — Log in</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.1);
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 380px;
    }
    h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: 0.25rem; color: #111; }
    p.sub { font-size: 0.875rem; color: #666; margin-bottom: 2rem; }
    label { display: block; font-size: 0.8rem; font-weight: 500; color: #444; margin-bottom: 0.35rem; }
    input {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s;
      margin-bottom: 1rem;
    }
    input:focus { border-color: #6366f1; }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #4f46e5; }
    .error { color: #dc2626; font-size: 0.85rem; margin-top: 0.75rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>TideLearn</h1>
    <p class="sub">Sign in to continue</p>
    <form method="POST" action="/login">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="email" required autofocus />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">Sign in</button>
      {{ERROR}}
    </form>
  </div>
</body>
</html>`;

const SUCCESS_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TideLearn — Signed in</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f5f5;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
    }
    .card {
      background: white; border-radius: 12px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.1);
      padding: 2.5rem 2rem; text-align: center; max-width: 340px;
    }
    .icon { font-size: 2.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.3rem; font-weight: 600; color: #111; margin-bottom: 0.5rem; }
    p { color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Signed in successfully</h1>
    <p>You can close this tab and return to Claude.</p>
  </div>
</body>
</html>`;

/** Start a short-lived local HTTP server that handles the login form. */
function startLoginServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(LOGIN_PAGE.replace("{{ERROR}}", ""));
        return;
      }

      if (req.method === "POST" && req.url === "/login") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          const params = new URLSearchParams(body);
          const email = params.get("email") ?? "";
          const password = params.get("password") ?? "";

          try {
            const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
              auth: { persistSession: false },
            });
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error || !data.session) throw new Error(error?.message ?? "Invalid credentials");

            await saveSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
            });

            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(SUCCESS_PAGE);
            server.close();
          } catch (e: any) {
            const errorHtml = `<p class="error">${e.message ?? "Login failed. Try again."}</p>`;
            res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
            res.end(LOGIN_PAGE.replace("{{ERROR}}", errorHtml));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    // Auto-close after 10 minutes
    const timeout = setTimeout(() => server.close(), 10 * 60 * 1000);
    server.on("close", () => clearTimeout(timeout));

    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as any).port;
      resolve(`http://localhost:${port}`);
    });

    server.on("error", reject);
  });
}

export function registerAuthTools(server: McpServer) {
  server.tool(
    "tidelearn_login",
    "Open a browser login page for TideLearn. Returns a URL — give it to the user to click. No credentials needed in chat. After the user confirms they have signed in, read the tidelearn://instructions resource before using any other tools — it contains the full block schema, tool reference, and critical rules.",
    {},
    async () => {
      try {
        const url = await startLoginServer();
        return ok({
          message: `Open this URL in your browser to log in:\n\n${url}\n\nOnce you've signed in, close the tab and tell me, then read the tidelearn://instructions resource for the full block schema and tool reference.`,
          url,
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
