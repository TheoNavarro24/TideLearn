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
import {
  Copy,
  Download,
  Package,
  Link,
  Trash2,
  Globe,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

/* ─── Types ────────────────────────────────────────────────── */
interface CourseIndex {
  id: string;
  title: string;
  updatedAt: string | number;
  lessons?: unknown[];
  isPublic?: boolean;
  coverImageUrl?: string | null;
}

/* ─── DropItem ───────────────────────────────────────────────── */
function DropItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: (e?: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[13px] transition-colors border-0 cursor-pointer text-left bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)] focus-visible:ring-inset ${
        danger
          ? "text-[var(--danger)] hover:bg-[var(--danger-bg)]"
          : "text-[var(--ink)] hover:bg-[hsl(var(--muted))]"
      }`}
    >
      <span className="flex items-center justify-center w-4 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

/* ─── EmptyState ─────────────────────────────────────────────── */
function EmptyState({
  onCreateClick,
  onImportClick,
}: {
  onCreateClick: () => void;
  onImportClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="text-4xl">📚</div>
      <div className="font-display text-xl font-semibold" style={{ color: "var(--ink)" }}>
        No courses yet
      </div>
      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
        Create your first course to get started.
      </div>
      <div className="flex gap-2">
        <button
          className="text-sm font-bold rounded-md px-4 py-2 border-none cursor-pointer"
          style={{ background: "var(--accent-hex)", color: "#0a1c18" }}
          onClick={onCreateClick}
        >
          + Create a course
        </button>
        <button
          className="text-sm font-medium rounded-md px-4 py-2 cursor-pointer"
          style={{
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid hsl(var(--border))",
          }}
          onClick={onImportClick}
        >
          Import JSON
        </button>
      </div>
    </div>
  );
}

/* ─── CourseCard ─────────────────────────────────────────────── */
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
  animationIndex: number;
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
  animationIndex,
}: CardProps) {
  const isOpen = openDropdownId === course.id;
  const dropRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const lessonCount = Array.isArray(course.lessons) ? course.lessons.length : 0;

  const updatedLabel = (() => {
    try {
      return new Date(course.updatedAt).toLocaleDateString();
    } catch {
      return "";
    }
  })();

  /* close dropdown on outside click */
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

  const animDelay = Math.min(animationIndex * 40, 200);

  // Generate a cover gradient based on title initial
  const coverColors = [
    ["#2d3a4a", "#3a4d60"],
    ["#1e3245", "#2d4a65"],
    ["#2a3545", "#3d5068"],
  ];
  const colorPair = coverColors[course.title.charCodeAt(0) % coverColors.length];

  return (
    <div
      className="course-card rounded-[var(--radius-lg)] overflow-hidden flex flex-col cursor-pointer group"
      style={{
        background: "var(--canvas-white)",
        border: "1px solid hsl(var(--border))",
        transition: "transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "var(--shadow-hover)" : "none",
        animation: `card-in 350ms var(--ease-out) both`,
        animationDelay: `${animDelay}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(course.id)}
    >
      {/* Cover strip — 82px */}
      <div
        className="relative flex-shrink-0 flex items-end"
        style={{
          height: 82,
          background: course.coverImageUrl
            ? undefined
            : `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
        }}
      >
        {course.coverImageUrl && (
          <img
            src={course.coverImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Emoji / letter identifier */}
        <span className="relative z-10 px-3 pb-2 text-2xl leading-none text-white/70">
          {course.title.charAt(0).toUpperCase()}
        </span>
        {/* ··· button — always visible at 35% opacity */}
        <div ref={dropRef} className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenDropdownId(isOpen ? null : course.id)}
            className="w-7 h-7 rounded flex items-center justify-center text-white text-base transition-opacity"
            style={{
              background: "rgba(0,0,0,0.25)",
              opacity: isOpen ? 1 : 0.35,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => {
              if (!isOpen) e.currentTarget.style.opacity = "0.35";
            }}
            title="More options"
          >
            ···
          </button>
          {isOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 mt-1 z-[100] min-w-[172px] py-1 rounded-[var(--radius-md)]"
              style={{
                background: "var(--canvas-white)",
                border: "1px solid hsl(var(--border))",
                boxShadow: "var(--shadow-popup)",
                animation: "dropdown-in 120ms var(--ease-out)",
                transformOrigin: "top right",
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
                label={
                  course.isPublic !== false
                    ? "Copy share link"
                    : "Copy share link (private)"
                }
                onClick={() => {
                  if (course.isPublic === false) return;
                  setOpenDropdownId(null);
                  navigator.clipboard.writeText(
                    `${window.location.origin}/view?id=${course.id}`
                  );
                }}
              />
              {isLoggedIn && (
                <DropItem
                  icon={
                    course.isPublic !== false ? (
                      <Globe className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )
                  }
                  label={
                    course.isPublic !== false ? "Make private" : "Make public"
                  }
                  onClick={(e) => {
                    setOpenDropdownId(null);
                    onToggleVisibility(course.id, course.isPublic ?? true);
                  }}
                />
              )}
              <div className="h-px my-1" style={{ background: "hsl(var(--border))" }} />
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
        {uploadingCoverId === course.id && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs z-10">
            Uploading…
          </div>
        )}
        {isLoggedIn && (
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.15)" }}
            onClick={(e) => {
              e.stopPropagation();
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/jpeg,image/png,image/webp,image/gif";
              input.onchange = (ev) => {
                const file = (ev.target as HTMLInputElement).files?.[0];
                if (file) onCoverUpload(course.id, file);
              };
              input.click();
            }}
          >
            <span className="text-white text-xs font-medium">Change cover</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-3.5 gap-2.5">
        {/* Title */}
        <div
          className="font-sans text-[13px] font-semibold leading-snug"
          style={{ color: "var(--ink)" }}
        >
          {course.title}
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span
              className="text-[15px] font-bold leading-none"
              style={{ color: "var(--ink)" }}
            >
              {lessonCount}
            </span>
            <span
              className="text-[9.5px] uppercase tracking-wide mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              LESSON{lessonCount !== 1 ? "S" : ""}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center mt-auto pt-2"
          style={{ borderTop: "1px solid hsl(var(--border))" }}
        >
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {updatedLabel}
          </span>
          <span
            className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              background:
                course.isPublic !== false
                  ? "var(--accent-bg)"
                  : "rgba(106,122,144,0.1)",
              color:
                course.isPublic !== false
                  ? "var(--accent-hex)"
                  : "var(--text-muted)",
            }}
          >
            {course.isPublic !== false ? "Published" : "Draft"}
          </span>
          <button
            className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded transition-opacity"
            style={{
              background: "var(--accent-bg)",
              color: "var(--accent-hex)",
              opacity: hovered ? 1 : 0,
              transition: "opacity 150ms",
              border: "none",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(course.id);
            }}
          >
            Edit →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, coverImageUrl: url } : c))
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
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, isPublic: next } : c))
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

  const handleOpenCourse = (id: string) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => navigate(`/editor?courseId=${id}`));
    } else {
      navigate(`/editor?courseId=${id}`);
    }
  };

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

  return (
    <>
      <AppShell
        topBar={
          <div className="flex items-center w-full gap-3">
            <span
              className="font-display text-[15px] font-semibold flex-1"
              style={{ color: "var(--ink)" }}
            >
              My Courses
            </span>
            {/* Search */}
            <input
              className="border rounded-md px-3 py-1.5 text-xs bg-transparent outline-none"
              style={{
                borderColor: "hsl(var(--border))",
                color: "var(--ink)",
                width: 200,
              }}
              placeholder="Search courses…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="border bg-transparent text-xs font-medium rounded-md px-3 py-1.5 transition-colors"
              style={{
                borderColor: "hsl(var(--border))",
                color: "var(--text-muted)",
              }}
              onClick={() => importRef.current?.click()}
            >
              Import JSON
            </button>
            <button
              className="text-xs font-bold rounded-md px-3.5 py-1.5 border-none cursor-pointer"
              style={{ background: "var(--accent-hex)", color: "#0a1c18" }}
              onClick={onCreate}
              disabled={creating}
            >
              + New Course
            </button>
          </div>
        }
      >
        <div className="px-8 py-7">
          {/* New course name input */}
          <div
            className="mb-6 flex items-center gap-2"
            style={{
              borderRadius: "var(--radius-md)",
              background: "var(--canvas-white)",
              border: "1px solid hsl(var(--border))",
              overflow: "hidden",
            }}
          >
            <input
              ref={newCourseInputRef}
              className="flex-1 border-none bg-transparent text-sm px-3.5 py-2.5 outline-none"
              style={{ color: "var(--ink)" }}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreate();
              }}
              placeholder="Name your new course and press Enter…"
            />
            <button
              className="text-xs font-bold py-2.5 px-4 border-none cursor-pointer flex-shrink-0"
              style={{ background: "var(--accent-hex)", color: "#0a1c18" }}
              onClick={onCreate}
              disabled={creating}
            >
              Create →
            </button>
          </div>

          {/* Course count */}
          <div className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {filteredCourses.length}{" "}
            {filteredCourses.length === 1 ? "course" : "courses"}
          </div>

          {/* Grid */}
          {courses.length === 0 ? (
            <EmptyState
              onCreateClick={() => newCourseInputRef.current?.focus()}
              onImportClick={() => importRef.current?.click()}
            />
          ) : filteredCourses.length === 0 ? (
            <div
              className="py-10 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No courses match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((c, i) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  onOpen={handleOpenCourse}
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
                  animationIndex={i}
                />
              ))}
            </div>
          )}
        </div>
      </AppShell>

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

      {/* Delete dialog */}
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
              className="border-none rounded-[7px] py-2 px-[18px] font-semibold cursor-pointer text-[13px]"
              style={{ background: "hsl(var(--muted))", color: "var(--ink)" }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="border-none rounded-[7px] py-2 px-[18px] font-bold cursor-pointer text-[13px]"
              style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
