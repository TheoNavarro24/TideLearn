import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/auth/AuthContext";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const displayName = user?.email?.split("@")[0] ?? "";
  const [nameValue, setNameValue] = useState(displayName);

  return (
    <AppShell
      topBar={
        <span className="font-display text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
          Settings
        </span>
      }
    >
      <div className="px-8 py-8 max-w-[520px]">

        {/* Profile */}
        <Section label="Profile">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative w-[52px] h-[52px] flex-shrink-0 group">
              <div
                className="w-full h-full rounded-full flex items-center justify-center text-lg font-bold"
                style={{
                  background: "var(--accent-bg)",
                  color: "var(--accent-hex)",
                }}
              >
                {user?.email?.slice(0, 2).toUpperCase() ?? "??"}
              </div>
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-medium text-white"
                style={{ background: "rgba(0,0,0,0.35)" }}
                title="Edit avatar"
              >
                ✏
              </div>
            </div>
          </div>

          {/* Display name */}
          <div className="mb-4">
            <label htmlFor="settings-display-name" className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
              Display name
            </label>
            <input
              id="settings-display-name"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm border outline-none transition-colors"
              style={{
                background: "var(--canvas-white)",
                borderColor: "hsl(var(--border))",
                color: "var(--ink)",
              }}
            />
          </div>

          {/* Email */}
          <div className="mb-5">
            <label htmlFor="settings-email" className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
              Email
            </label>
            <input
              id="settings-email"
              value={user?.email ?? ""}
              readOnly
              className="w-full rounded-md px-3 py-2 text-sm border outline-none"
              style={{
                background: "hsl(var(--muted))",
                borderColor: "hsl(var(--border))",
                color: "var(--text-muted)",
                cursor: "default",
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Managed by Google</p>
          </div>

          <button
            onClick={() => toast({ title: "Saved" })}
            className="text-sm font-bold px-4 py-2 rounded-md border-none cursor-pointer"
            style={{ background: "var(--accent-hex)", color: "#0a1c18" }}
          >
            Save changes
          </button>
        </Section>

        {/* Connected accounts */}
        <Section label="Connected accounts">
          <div
            className="flex items-center gap-3 p-3 rounded-md border"
            style={{ borderColor: "hsl(var(--border))", background: "var(--canvas-white)" }}
          >
            {/* Google logo placeholder */}
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "hsl(var(--muted))", color: "var(--ink)" }}
            >
              G
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>Google</div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{user?.email}</div>
            </div>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ background: "var(--accent-bg)", color: "var(--accent-hex)" }}
            >
              Connected
            </span>
          </div>
        </Section>

        {/* Session */}
        <Section label="Session">
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Sign out of TideLearn on this device.
          </p>
          <button
            onClick={signOut}
            className="text-sm font-medium px-4 py-2 rounded-md cursor-pointer border transition-colors hover:bg-[hsl(var(--muted))]"
            style={{
              background: "transparent",
              borderColor: "hsl(var(--border))",
              color: "var(--ink)",
            }}
          >
            Sign out
          </button>
        </Section>

        {/* Danger zone */}
        <div
          className="rounded-md p-5 border"
          style={{ borderColor: "rgba(176,64,64,0.3)", background: "rgba(176,64,64,0.03)" }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--danger)" }}>
            Danger zone
          </div>
          <div className="h-px mb-4" style={{ background: "rgba(176,64,64,0.15)" }} />
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm font-medium px-4 py-2 rounded-md cursor-pointer border transition-colors hover:bg-[var(--danger-bg)]"
              style={{
                background: "transparent",
                borderColor: "var(--danger)",
                color: "var(--danger)",
              }}
            >
              Delete account
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "var(--danger)" }}>Are you sure?</span>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-sm font-medium px-3 py-1.5 rounded-md cursor-pointer border"
                style={{ background: "transparent", borderColor: "hsl(var(--border))", color: "var(--ink)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-sm font-bold px-3 py-1.5 rounded-md cursor-pointer border-none"
                style={{ background: "var(--danger)", color: "white" }}
              >
                Yes, delete
              </button>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div
        className="text-[11px] font-bold uppercase tracking-wide pb-2 mb-4 border-b"
        style={{ color: "var(--text-muted)", borderColor: "hsl(var(--border))" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
