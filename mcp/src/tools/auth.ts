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
      const callbackUrl = `http://127.0.0.1:${port}/callback`;
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
