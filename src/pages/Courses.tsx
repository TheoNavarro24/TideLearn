import { useEffect, useRef, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import {
  getCoursesIndex,
  createNewCourse,
  deleteCourse,
  duplicateCourse,
  exportCourseJSON,
  loadCourse,
  migrateFromLegacy,
  saveCourse,
  loadCoursesFromCloud,
  deleteCourseFromCloud,
} from "@/lib/courses";
import { useAuth } from "@/components/auth/AuthContext";

/* ─── Types ────────────────────────────────────────────────── */
interface CourseIndex {
  id: string;
  title: string;
  updatedAt: string | number;
  lessons?: unknown[];
}

/* ─── Styles (inline, referencing CSS vars) ─────────────────── */
const S = {
  shell: {
    display: "grid",
    gridTemplateColumns: "216px 1fr",
    height: "100vh",
    overflow: "hidden",
  } as React.CSSProperties,

  /* sidebar */
  sidebar: {
    background: "var(--ocean-mid)",
    borderRight: "1px solid rgba(20,184,166,0.18)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  } as React.CSSProperties,

  logoArea: {
    padding: "18px 14px 16px",
    borderBottom: "1px solid rgba(20,184,166,0.18)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,

  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 6,
    background: "var(--gradient-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    flexShrink: 0,
  } as React.CSSProperties,

  logoText: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 800,
    fontSize: 15,
    color: "#ffffff",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  nav: {
    flex: 1,
    padding: "14px 10px",
    overflowY: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "rgba(94,234,212,0.5)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    padding: "8px 10px 4px",
  } as React.CSSProperties,

  navItem: (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    color: active ? "#ccfbf1" : "rgba(209,250,229,0.65)",
    background: active ? "rgba(20,184,166,0.18)" : "transparent",
    cursor: "pointer",
    border: "none",
    textAlign: "left" as const,
    width: "100%",
    transition: "background 0.15s, color 0.15s",
  }),

  navBadge: {
    marginLeft: "auto",
    background: "rgba(20,184,166,0.25)",
    color: "#5eead4",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 10,
    padding: "1px 7px",
  } as React.CSSProperties,

  sidebarFooter: {
    borderTop: "1px solid rgba(20,184,166,0.18)",
    padding: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,

  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "var(--gradient-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  } as React.CSSProperties,

  avatarMeta: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  avatarName: {
    fontSize: 12,
    fontWeight: 600,
    color: "#a7f3d0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  avatarEmail: {
    fontSize: 10,
    color: "rgba(94,234,212,0.5)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  signOutBtn: {
    background: "none",
    border: "none",
    color: "rgba(94,234,212,0.5)",
    fontSize: 14,
    cursor: "pointer",
    padding: "2px 4px",
    borderRadius: 4,
    flexShrink: 0,
    lineHeight: 1,
  } as React.CSSProperties,

  /* main */
  main: {
    background: "#ffffff",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  } as React.CSSProperties,

  topbar: {
    background: "#ffffff",
    borderBottom: "1px solid #e0fdf4",
    height: 54,
    display: "flex",
    alignItems: "center",
    padding: "0 28px",
    gap: 12,
    flexShrink: 0,
  } as React.CSSProperties,

  topbarTitle: {
    fontFamily: "Lora, Georgia, serif",
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-primary)",
    flex: 1,
  } as React.CSSProperties,

  importBtn: {
    background: "none",
    border: "1.5px solid #99f6e4",
    color: "var(--teal-primary)",
    fontWeight: 600,
    fontSize: 13,
    borderRadius: 7,
    padding: "6px 14px",
    cursor: "pointer",
  } as React.CSSProperties,

  newCourseBtn: {
    background: "var(--gradient-primary)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    borderRadius: 7,
    padding: "6px 16px",
    border: "none",
    cursor: "pointer",
  } as React.CSSProperties,

  newCoursePrompt: {
    margin: "22px 28px 0",
    background: "#fff",
    border: "1.5px solid #e0fdf4",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    flexShrink: 0,
  } as React.CSSProperties,

  newCourseInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    fontSize: 14,
    padding: "10px 14px",
    outline: "none",
    color: "var(--text-primary)",
  } as React.CSSProperties,

  searchBar: {
    padding: "14px 28px",
    background: "#fff",
    borderBottom: "1px solid #f0fdf4",
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    flexShrink: 0,
  } as React.CSSProperties,

  searchInput: {
    width: 260,
    background: "#f5fffe",
    border: "1.5px solid #d1faf4",
    borderRadius: 7,
    padding: "7px 12px",
    fontSize: 13,
    outline: "none",
    color: "var(--text-primary)",
  } as React.CSSProperties,

  searchCount: {
    marginLeft: "auto",
    fontSize: 13,
    color: "#94a3b8",
  } as React.CSSProperties,

  gridArea: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "22px 28px 48px",
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
    gap: 24,
  } as React.CSSProperties,

  /* empty state */
  emptyWrap: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 40px",
    gap: 16,
    textAlign: "center" as const,
  } as React.CSSProperties,

  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    background: "#e0fdf7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 40,
  } as React.CSSProperties,

  emptyTitle: {
    fontFamily: "Lora, Georgia, serif",
    fontSize: 22,
    fontWeight: 700,
    color: "var(--text-primary)",
  } as React.CSSProperties,

  emptySub: {
    fontSize: 14,
    color: "#64748b",
  } as React.CSSProperties,

  emptyCta: {
    background: "var(--gradient-primary)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    borderRadius: 8,
    padding: "10px 24px",
    border: "none",
    cursor: "pointer",
  } as React.CSSProperties,

  emptyLink: {
    fontSize: 13,
    color: "var(--teal-primary)",
    cursor: "pointer",
    textDecoration: "underline",
    background: "none",
    border: "none",
  } as React.CSSProperties,
};

/* ─── Course Card ────────────────────────────────────────────── */
interface CardProps {
  course: CourseIndex;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
  onExportScorm: (id: string) => void;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
}

function CourseCard({
  course,
  onOpen,
  onDelete,
  onDuplicate,
  onExport,
  onExportScorm,
  openDropdownId,
  setOpenDropdownId,
}: CardProps) {
  const isOpen = openDropdownId === course.id;
  const dropRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const lessonCount = Array.isArray(course.lessons)
    ? course.lessons.length
    : 0;

  const updatedLabel = (() => {
    try {
      return new Date(course.updatedAt).toLocaleDateString();
    } catch {
      return "";
    }
  })();

  /* close on outside click */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, setOpenDropdownId]);

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: `1px solid ${hovered ? "#5eead4" : "#e2f4f1"}`,
    borderRadius: 10,
    position: "relative",
    transition: "border-color 0.18s, box-shadow 0.18s, transform 0.18s",
    boxShadow: hovered ? "0 4px 20px rgba(13,148,136,0.12)" : "none",
    transform: hovered ? "translateY(-2px)" : "none",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card visual header */}
      <div
        style={{
          overflow: "hidden",
          borderRadius: "9px 9px 0 0",
        }}
      >
        <div
          style={{
            height: 88,
            background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
            position: "relative",
          }}
        >
          {/* Radial highlight overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.15) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />
          {/* Dots top-right */}
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 14,
              display: "flex",
              gap: 5,
            }}
          >
            {[false, false, true].map((active, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: active
                    ? "rgba(255,255,255,0.85)"
                    : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
          {/* Lesson count bottom-left */}
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 14,
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div
        style={{
          padding: "14px 16px 16px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
          }}
        >
          {course.title}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#94a3b8",
            marginBottom: 10,
          }}
        >
          {updatedLabel}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
          <button
            onClick={() => onOpen(course.id)}
            style={{
              flex: 1,
              background: "var(--gradient-primary)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 6,
              padding: "7px 0",
              border: "none",
              cursor: "pointer",
            }}
          >
            Open →
          </button>

          {/* Overflow button */}
          <div ref={dropRef} style={{ position: "relative" }}>
            <button
              onClick={() => setOpenDropdownId(isOpen ? null : course.id)}
              style={{
                width: 32,
                height: 32,
                background: isOpen ? "#f0fdfb" : "#f8fffe",
                border: "1px solid #e0fdf4",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
              }}
              title="More options"
            >
              ···
            </button>

            {isOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 100,
                  background: "#fff",
                  border: "1px solid #e0fdf4",
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(13,148,136,0.12)",
                  minWidth: 172,
                  padding: "4px 0",
                }}
              >
                <DropItem
                  icon="📋"
                  label="Duplicate"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onDuplicate(course.id);
                  }}
                />
                <DropItem
                  icon="📤"
                  label="Export JSON"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onExport(course.id);
                  }}
                />
                <DropItem
                  icon="📦"
                  label="Export SCORM"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onExportScorm(course.id);
                  }}
                />
                <DropItem
                  icon="🔗"
                  label="Copy share link"
                  onClick={() => {
                    setOpenDropdownId(null);
                    navigator.clipboard.writeText(
                      `${window.location.origin}/view?id=${course.id}`
                    );
                  }}
                />
                <div
                  style={{
                    height: 1,
                    background: "#e0fdf4",
                    margin: "4px 0",
                  }}
                />
                <DropItem
                  icon="🗑"
                  label="Delete"
                  danger
                  onClick={() => {
                    setOpenDropdownId(null);
                    onDelete(course.id);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DropItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "7px 14px",
        background: hov ? (danger ? "#fff5f5" : "#f0fdfb") : "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        color: danger ? "#ef4444" : "#334155",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  );
}

/* ─── Nav Item ───────────────────────────────────────────────── */
function NavItem({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const style: React.CSSProperties = {
    ...S.navItem(!!active),
    background:
      active
        ? "rgba(20,184,166,0.18)"
        : hov
        ? "rgba(20,184,166,0.12)"
        : "transparent",
    color: active || hov ? "#ccfbf1" : "rgba(209,250,229,0.65)",
  };
  return (
    <button style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onClick}>
      <span>{icon}</span>
      <span>{label}</span>
      {badge !== undefined && <span style={S.navBadge}>{badge}</span>}
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function Courses() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [courses, setCourses] = useState<CourseIndex[]>(getCoursesIndex());
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const newCourseInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => setCourses(getCoursesIndex());

  /* migration */
  useEffect(() => {
    const migrated = migrateFromLegacy();
    if (migrated) refresh();
  }, []);

  /* cloud/local load */
  useEffect(() => {
    async function loadCourses() {
      if (user) {
        const cloudCourses = await loadCoursesFromCloud();
        setCourses(cloudCourses);
      } else {
        setCourses(getCoursesIndex());
      }
    }
    loadCourses();
  }, [user]);

  /* debounced search */
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredCourses = useMemo(
    () =>
      courses.filter((c) =>
        c.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [courses, debouncedSearch]
  );

  const onCreate = () => {
    setCreating(true);
    const t = newTitle.trim() || "Untitled Course";
    const { id } = createNewCourse(t);
    setCreating(false);
    setNewTitle("");
    refresh();
    navigate(`/editor?courseId=${id}`);
  };

  const onOpen = (id: string) => navigate(`/editor?courseId=${id}`);
  const onDelete = (id: string) => setDeleteId(id);
  const confirmDelete = async () => {
    if (deleteId) {
      deleteCourse(deleteId);
      if (user) {
        try {
          await deleteCourseFromCloud(deleteId);
        } catch (e) {
          console.error("Failed to delete from cloud:", e);
        }
      }
      setCourses((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
    }
  };
  const cancelDelete = () => setDeleteId(null);
  const onDuplicate = (id: string) => {
    const nid = duplicateCourse(id);
    if (nid) {
      refresh();
      navigate(`/editor?courseId=${nid}`);
    }
  };
  const onExport = (id: string) => {
    const c = loadCourse(id);
    if (!c) return;
    const blob = new Blob([exportCourseJSON(c)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.title || "course"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const onExportScorm = async (id: string) => {
    const c = loadCourse(id);
    if (!c) return;
    try {
      const viewUrl = `${window.location.origin}/view?id=${id}`;
      const { exportScorm12Zip, buildScormFileName } = await import("@/lib/scorm12");
      const blob = await exportScorm12Zip(c as any, viewUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildScormFileName(c.title || "course");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("SCORM export failed:", e);
    }
  };

  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data?.lessons) throw new Error("Invalid");
      const { id } = createNewCourse(data.title || "Imported Course");
      saveCourse(id, {
        schemaVersion: 1,
        title: data.title || "Imported Course",
        lessons: data.lessons,
      });
      refresh();
      navigate(`/editor?courseId=${id}`);
    } catch (e) {
      alert("Import failed");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const initial = user?.email?.[0]?.toUpperCase() ?? "T";
  const displayName = user?.email?.split("@")[0] ?? "Theo";

  return (
    <div style={S.shell}>
      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        {/* Logo */}
        <div style={S.logoArea}>
          <div style={S.logoMark}>🌊</div>
          <span style={S.logoText}>TideLearn</span>
        </div>

        {/* Nav */}
        <nav style={S.nav}>
          <span style={S.sectionLabel}>Library</span>
          <NavItem icon="📚" label="My Courses" active badge={courses.length} />
          <NavItem
            icon="⚡"
            label="Quick Draft"
            onClick={() => navigate("/editor")}
          />
          <span style={{ ...S.sectionLabel, marginTop: 8 }}>Tools</span>
          <NavItem
            icon="📤"
            label="Import JSON"
            onClick={() => importRef.current?.click()}
          />
        </nav>

        {/* Footer */}
        <div style={S.sidebarFooter}>
          {user ? (
            <>
              <div style={S.avatar}>{initial}</div>
              <div style={S.avatarMeta}>
                <div style={S.avatarName}>{displayName}</div>
                <div style={S.avatarEmail}>{user.email}</div>
              </div>
              <button
                style={S.signOutBtn}
                onClick={signOut}
                title="Sign out"
              >
                ↩
              </button>
            </>
          ) : (
            <a
              href="/auth"
              style={{
                color: "#5eead4",
                fontSize: 13,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign in →
            </a>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={S.main}>
        {/* Topbar */}
        <div style={S.topbar}>
          <span style={S.topbarTitle}>My Courses</span>
          <button
            style={S.importBtn}
            onClick={() => importRef.current?.click()}
          >
            Import
          </button>
          <button style={S.newCourseBtn} onClick={onCreate} disabled={creating}>
            + New Course
          </button>
        </div>

        {/* New course prompt */}
        <div style={S.newCoursePrompt}>
          <input
            ref={newCourseInputRef}
            style={S.newCourseInput}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreate();
            }}
            placeholder="Name your new course — e.g. Fire Safety Induction 2026…"
          />
          <button
            style={{
              ...S.newCourseBtn,
              borderRadius: 0,
              padding: "10px 18px",
              fontSize: 13,
              flexShrink: 0,
            }}
            onClick={onCreate}
            disabled={creating}
          >
            Create →
          </button>
        </div>

        {/* Search bar */}
        <div style={S.searchBar}>
          <input
            style={S.searchInput}
            placeholder="Search courses…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span style={S.searchCount}>
            <strong>{filteredCourses.length}</strong> courses
          </span>
        </div>

        {/* Grid area */}
        <div style={S.gridArea}>
          {courses.length === 0 ? (
            /* Empty state */
            <div style={S.emptyWrap}>
              <div style={S.emptyIcon}>🌊</div>
              <div style={S.emptyTitle}>Your ocean is empty</div>
              <div style={S.emptySub}>
                Create your first course to get started with TideLearn.
              </div>
              <button
                style={S.emptyCta}
                onClick={() => {
                  newCourseInputRef.current?.focus();
                }}
              >
                + Create a course
              </button>
              <button
                style={S.emptyLink}
                onClick={() => importRef.current?.click()}
              >
                or import an existing JSON file
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              No courses match your search.
            </div>
          ) : (
            <div style={S.grid}>
              {filteredCourses.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  onOpen={onOpen}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onExport={onExport}
                  onExportScorm={onExportScorm}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Hidden import input */}
      <input
        ref={importRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importJSON(f);
        }}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this course?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={cancelDelete}
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: 7,
                padding: "8px 18px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              style={{
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                padding: "8px 18px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
