import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { BookOpen, Settings, HelpCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  /** Optional custom sidebar content (e.g., Editor lesson list) */
  sidebar?: React.ReactNode;
  /** Top bar content */
  topBar: React.ReactNode;
}

export function AppShell({ children, sidebar, topBar }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-[var(--sidebar-w-editor)] flex-col flex-shrink-0"
        style={{ background: "var(--sidebar)", borderRight: "1px solid var(--accent-bg)" }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-4 py-4 border-b"
          style={{ borderColor: "var(--accent-bg)" }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--accent-hex)", color: "#0a1c18" }}
          >
            T
          </div>
          <span
            className="font-display text-sm font-semibold"
            style={{ color: "hsl(var(--sidebar-foreground))" }}
          >
            TideLearn
          </span>
        </div>

        {/* Nav or custom sidebar */}
        {sidebar ?? (
          <nav className="sidebar-nav flex-1 p-2 space-y-0.5">
            <NavItem
              icon={BookOpen}
              label="My Courses"
              active={location.pathname === "/courses"}
              onClick={() => navigate("/courses")}
            />
            <NavItem
              icon={Settings}
              label="Settings"
              active={location.pathname === "/settings"}
              onClick={() => navigate("/settings")}
            />
            <NavItem
              icon={HelpCircle}
              label="Help"
              active={false}
              onClick={() => {}}
            />
          </nav>
        )}

        {/* User avatar */}
        {user && (
          <div
            className="flex items-center gap-2.5 px-4 py-3 border-t"
            style={{ borderColor: "var(--accent-bg)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: "var(--accent-bg)", color: "var(--accent-hex)" }}
            >
              {user.email?.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs truncate flex-1" style={{ color: "var(--sidebar-text)" }}>
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: "var(--sidebar-text)" }}
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5 [stroke-width:2]" />
            </button>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ background: "var(--canvas)" }}
      >
        {/* Top bar */}
        <header
          className="h-[var(--topbar-h)] flex items-center px-5 flex-shrink-0 border-b"
          style={{ background: "var(--canvas-white)", borderColor: "hsl(var(--border))" }}
        >
          {topBar}
        </header>

        {/* Content */}
        <main id="main-content" className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
        active
          ? "text-[var(--accent-hex)]"
          : "text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)]"
      )}
      style={active ? { background: "var(--accent-bg)" } : undefined}
    >
      <Icon className="w-[13px] h-[13px] [stroke-width:2]" />
      {label}
    </button>
  );
}
