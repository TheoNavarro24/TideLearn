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
              {course.isPublic !== false ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
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
                <div className="h-px bg-emerald-100 my-1" />
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
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors border-none cursor-pointer text-left",
        danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
      )}
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
      <main id="main-content" className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 md:px-10 py-8 max-w-7xl mx-auto">
          {/* Topbar */}
          <div className="bg-white border-b border-teal-100 h-[54px] flex items-center px-7 gap-3 shrink-0 rounded-t-lg">
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
                <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center">
                  <Waves className="w-10 h-10 text-teal-500" />
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
