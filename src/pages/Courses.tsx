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
  setCourseVisibility,
  setCourseCoverImage,
  uploadCourseCover,
  duplicateCourseInCloud,
} from "@/lib/courses";
import { useAuth } from "@/components/auth/AuthContext";
import { cn } from "@/lib/utils";
import {
  Waves,
  BookOpen,
  Zap,
  Upload,
  Copy,
  Download,
  Package,
  Link,
  Trash2,
  Globe,
  Lock,
  LogOut,
} from "lucide-react";

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
      {/* Cover image area */}
      <div
        style={{
          height: 120,
          background: course.coverImageUrl
            ? `url(${course.coverImageUrl}) center/cover no-repeat`
            : "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
          borderRadius: "10px 10px 0 0",
          position: "relative",
          cursor: isLoggedIn ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
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
        {!course.coverImageUrl && (
          <span style={{ fontSize: 28, opacity: 0.5, color: "#fff" }}>
            {course.title.charAt(0).toUpperCase()}
          </span>
        )}
        {uploadingCoverId === course.id && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 12, borderRadius: "10px 10px 0 0",
          }}>
            Uploading…
          </div>
        )}
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

          {/* Visibility toggle */}
          {isLoggedIn && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(course.id, course.isPublic ?? true); }}
              title={course.isPublic !== false ? "Public — click to make private" : "Private — click to make public"}
              style={{
                background: "none",
                border: "1px solid #e0fdf4",
                borderRadius: 6,
                cursor: "pointer",
                padding: "4px 6px",
                color: course.isPublic !== false ? "#0d9488" : "#94a3b8",
                fontSize: 13,
                width: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {course.isPublic !== false ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
          )}

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
                  icon={<Copy className="w-3.5 h-3.5" />}
                  label="Duplicate"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onDuplicate(course.id);
                  }}
                />
                <DropItem
                  icon={<Download className="w-3.5 h-3.5" />}
                  label="Export JSON"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onExport(course.id);
                  }}
                />
                <DropItem
                  icon={<Package className="w-3.5 h-3.5" />}
                  label="Export SCORM"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onExportScorm(course.id);
                  }}
                />
                <DropItem
                  icon={<Link className="w-3.5 h-3.5" />}
                  label={course.isPublic !== false ? "Copy share link" : "Copy share link (private)"}
                  onClick={() => {
                    if (course.isPublic === false) return;
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
                  icon={<Trash2 className="w-3.5 h-3.5" />}
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
  icon: React.ReactNode;
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
      <span className="flex items-center justify-center w-4">{icon}</span>
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
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors border-none cursor-pointer text-left",
        active
          ? "bg-white/15 text-white font-medium"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
      onClick={onClick}
    >
      <span className="flex items-center">{icon}</span>
      <span>{label}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-teal-500/25 text-teal-300 text-[11px] font-bold rounded-full px-1.5 py-px">
          {badge}
        </span>
      )}
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
    <div className="grid md:grid-cols-[var(--sidebar-w-editor)_1fr] grid-cols-1 h-screen overflow-hidden">
      {/* ── Mobile header ── */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <Waves className="w-5 h-5 text-teal-600" />
        <span className="font-display text-lg font-semibold text-[var(--ocean-mid)]">TideLearn</span>
      </div>

      {/* ── Sidebar ── */}
      <aside className="w-[var(--sidebar-w-editor)] bg-[var(--ocean-mid)] text-white flex flex-col h-screen shrink-0 hidden md:flex">
        {/* Logo */}
        <div className="px-3.5 py-4 pb-4 border-b border-teal-500/[0.18] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <span className="font-sans font-extrabold text-[15px] text-white tracking-tight">TideLearn</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3.5 overflow-y-auto flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-teal-300/50 uppercase tracking-widest px-2.5 pt-2 pb-1">Library</span>
          <NavItem icon={<BookOpen className="w-4 h-4" />} label="My Courses" active badge={courses.length} />
          <NavItem
            icon={<Zap className="w-4 h-4" />}
            label="Quick Draft"
            onClick={() => navigate("/editor")}
          />
          <span className="text-[10px] font-bold text-teal-300/50 uppercase tracking-widest px-2.5 pt-4 pb-1">Tools</span>
          <NavItem
            icon={<Upload className="w-4 h-4" />}
            label="Import JSON"
            onClick={() => importRef.current?.click()}
          />
        </nav>

        {/* Footer */}
        <div className="border-t border-teal-500/[0.18] p-3.5 flex items-center gap-2.5">
          {user ? (
            <>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-[13px] font-bold text-white shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-emerald-200 truncate">{displayName}</div>
                <div className="text-[10px] text-teal-300/50 truncate">{user.email}</div>
              </div>
              <button
                className="bg-transparent border-none text-teal-300/50 text-sm cursor-pointer p-0.5 rounded shrink-0 leading-none hover:text-teal-200 transition-colors"
                onClick={signOut}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <a
              href="/auth"
              className="text-teal-300 text-[13px] no-underline font-semibold hover:text-teal-200 transition-colors"
            >
              Sign in →
            </a>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={S.main}>
        {/* Topbar */}
        <div className="bg-white border-b border-teal-100 h-[54px] flex items-center px-7 gap-3 shrink-0">
          <span className="font-display text-lg font-bold text-[var(--text-primary)] flex-1">My Courses</span>
          <button
            className="bg-transparent border-[1.5px] border-teal-200 text-[var(--teal-primary)] font-semibold text-[13px] rounded-[7px] px-3.5 py-1.5 cursor-pointer hover:bg-teal-50 transition-colors"
            onClick={() => importRef.current?.click()}
          >
            Import
          </button>
          <button
            className="bg-[image:var(--gradient-primary)] text-white font-bold text-[13px] rounded-[7px] px-4 py-1.5 border-none cursor-pointer hover:opacity-90 transition-opacity"
            onClick={onCreate}
            disabled={creating}
          >
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
              <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center">
                <Waves className="w-10 h-10 text-teal-500" />
              </div>
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
