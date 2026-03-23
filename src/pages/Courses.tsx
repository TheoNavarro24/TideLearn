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
import { cn } from "@/lib/utils";
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
  setCourseVisibility,
  setCourseCoverImage,
  uploadCourseCover,
  duplicateCourseInCloud,
} from "@/lib/courses";
import { useAuth } from "@/components/auth/AuthContext";

/* ─── Types ────────────────────────────────────────────────── */
interface CourseIndex {
  id: string;
  title: string;
  updatedAt: string | number;
  lessons?: unknown[];
  isPublic?: boolean;
  coverImageUrl?: string | null;
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
  onCoverUpload: (id: string, file: File) => void;
  onToggleVisibility: (id: string, current: boolean) => void;
  uploadingCoverId: string | null;
  isLoggedIn: boolean;
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
  onCoverUpload,
  onToggleVisibility,
  uploadingCoverId,
  isLoggedIn,
  openDropdownId,
  setOpenDropdownId,
}: CardProps) {
  const isOpen = openDropdownId === course.id;
  const dropRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-teal-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
    >
      {/* Cover image area */}
      <div
        className={cn(
          "aspect-video overflow-hidden relative flex items-center justify-center",
          isLoggedIn ? "cursor-pointer" : "cursor-default"
        )}
        onClick={() => {
          if (!isLoggedIn) return;
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/jpeg,image/png,image/webp,image/gif";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) onCoverUpload(course.id, file);
          };
          input.click();
        }}
        title={isLoggedIn ? "Click to upload cover image" : undefined}
      >
        {course.coverImageUrl ? (
          <img
            src={course.coverImageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center">
            <span className="text-[28px] opacity-50 text-white">
              {course.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {uploadingCoverId === course.id && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs">
            Uploading…
          </div>
        )}
        {/* Lesson count bottom-left */}
        <div className="absolute bottom-2.5 left-3.5 text-xs font-semibold text-white/90">
          {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1 gap-1">
        <div className="font-sans text-[15px] font-bold text-[var(--text-primary)] tracking-tight leading-snug">
          {course.title}
        </div>
        <div className="text-xs font-medium text-slate-400 mb-2.5">
          {updatedLabel}
        </div>

        {/* Footer */}
        <div className="flex gap-1.5 mt-auto">
          <button
            onClick={() => onOpen(course.id)}
            className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold text-sm rounded-md py-1.5 border-none cursor-pointer"
          >
            Open →
          </button>

          {/* Visibility toggle */}
          {isLoggedIn && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(course.id, course.isPublic ?? true); }}
              title={course.isPublic !== false ? "Public — click to make private" : "Private — click to make public"}
              className={cn(
                "bg-transparent border border-emerald-100 rounded-md cursor-pointer px-1.5 py-1 text-sm w-8 flex items-center justify-center",
                course.isPublic !== false ? "text-teal-600" : "text-slate-400"
              )}
            >
              {course.isPublic !== false ? "🌐" : "🔒"}
            </button>
          )}

          {/* Overflow button */}
          <div ref={dropRef} className="relative">
            <button
              onClick={() => setOpenDropdownId(isOpen ? null : course.id)}
              className={cn(
                "w-8 h-8 border border-emerald-100 rounded-md cursor-pointer text-base flex items-center justify-center text-slate-400",
                isOpen ? "bg-emerald-50" : "bg-[#f8fffe]"
              )}
              title="More options"
            >
              ···
            </button>

            {isOpen && (
              <div className="absolute bottom-full right-0 mb-1.5 z-[100] bg-white border border-gray-200 rounded-lg shadow-lg min-w-[172px] py-1">
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
                  label={course.isPublic !== false ? "Copy share link" : "Copy share link (private)"}
                  onClick={() => {
                    if (course.isPublic === false) return;
                    setOpenDropdownId(null);
                    navigator.clipboard.writeText(
                      `${window.location.origin}/view?id=${course.id}`
                    );
                  }}
                />
                <div className="h-px bg-emerald-100 my-1" />
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
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors border-none cursor-pointer text-left",
        danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
      )}
    >
      <span className="text-sm">{icon}</span>
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

  const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null);

  async function refreshCourses() {
    if (user) {
      const cloudCourses = await loadCoursesFromCloud();
      setCourses(cloudCourses);
    } else {
      setCourses(getCoursesIndex());
    }
  }

  const refresh = () => setCourses(getCoursesIndex());

  async function handleCoverUpload(courseId: string, file: File) {
    if (!user) return;
    setUploadingCoverId(courseId);
    try {
      const url = await uploadCourseCover(user.id, courseId, file);
      await setCourseCoverImage(courseId, url);
      setCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, coverImageUrl: url } : c)
      );
    } catch (e) {
      console.error("Cover upload failed", e);
    } finally {
      setUploadingCoverId(null);
    }
  }

  async function handleToggleVisibility(courseId: string, current: boolean) {
    if (!user) return;
    const next = !current;
    try {
      await setCourseVisibility(courseId, next);
      setCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, isPublic: next } : c)
      );
    } catch (e) {
      console.error("Visibility toggle failed", e);
    }
  }

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
  const onDuplicate = async (id: string) => {
    const newId = duplicateCourse(id);
    if (!newId) return;
    if (user) {
      try {
        await duplicateCourseInCloud(id, newId, user.id);
      } catch (e) {
        console.error("Cloud duplication failed", e);
      }
    }
    await refreshCourses();
    navigate(`/editor?courseId=${newId}`);
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
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 md:px-10 py-8 max-w-7xl mx-auto">
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
          <div className="mt-5 bg-white border-[1.5px] border-emerald-100 rounded-lg flex items-center overflow-hidden flex-shrink-0">
            <input
              ref={newCourseInputRef}
              className="flex-1 border-none bg-transparent text-sm px-3.5 py-2.5 outline-none text-[var(--text-primary)]"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreate();
              }}
              placeholder="Name your new course — e.g. Fire Safety Induction 2026…"
            />
            <button
              className="bg-[var(--gradient-primary)] bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold text-sm rounded-none py-2.5 px-[18px] border-none cursor-pointer flex-shrink-0"
              onClick={onCreate}
              disabled={creating}
            >
              Create →
            </button>
          </div>

          {/* Search bar */}
          <div className="py-3.5 bg-white border-b border-green-50 flex items-center gap-3 mt-3.5 flex-shrink-0">
            <input
              className="w-[260px] bg-[#f5fffe] border-[1.5px] border-[#d1faf4] rounded-[7px] py-[7px] px-3 text-[13px] outline-none text-[var(--text-primary)]"
              placeholder="Search courses…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="ml-auto text-[13px] text-slate-400">
              <strong>{filteredCourses.length}</strong> courses
            </span>
          </div>

          {/* Grid area */}
          <div className="pt-5 pb-12">
            {courses.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-20 px-10 gap-4 text-center">
                <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center text-[40px]">
                  🌊
                </div>
                <div className="font-display text-[22px] font-bold text-[var(--text-primary)]">
                  Your ocean is empty
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  Create your first course to get started with TideLearn.
                </div>
                <button
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold text-sm rounded-lg py-2.5 px-6 border-none cursor-pointer"
                  onClick={() => {
                    newCourseInputRef.current?.focus();
                  }}
                >
                  + Create a course
                </button>
                <button
                  className="text-[13px] text-[var(--teal-primary)] cursor-pointer underline bg-transparent border-none"
                  onClick={() => importRef.current?.click()}
                >
                  or import an existing JSON file
                </button>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                No courses match your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCourses.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    onOpen={onOpen}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onExport={onExport}
                    onExportScorm={onExportScorm}
                    onCoverUpload={handleCoverUpload}
                    onToggleVisibility={handleToggleVisibility}
                    uploadingCoverId={uploadingCoverId}
                    isLoggedIn={!!user}
                    openDropdownId={openDropdownId}
                    setOpenDropdownId={setOpenDropdownId}
                  />
                ))}
              </div>
            )}
          </div>
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
              className="bg-slate-100 border-none rounded-[7px] py-2 px-[18px] font-semibold cursor-pointer text-[13px]"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="bg-red-500 text-white border-none rounded-[7px] py-2 px-[18px] font-bold cursor-pointer text-[13px]"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
