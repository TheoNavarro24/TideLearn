import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/AppShell";
import { useCourseList } from "@/hooks/useCourseList";
import { useCourseSearch } from "@/hooks/useCourseSearch";
import { CourseCard, EmptyState } from "@/pages/CourseCard";
import { loadCourse, exportCourseJSON } from "@/lib/courses";

export default function Courses() {
  const { user } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const newCourseInputRef = useRef<HTMLInputElement>(null);

  const {
    courses, uploadingCoverId,
    createCourse, openCourse, deleteCourse, duplicateCourse,
    handleCoverUpload, handleToggleVisibility, importCourse,
  } = useCourseList(user);

  const { searchTerm, setSearchTerm, filteredCourses } = useCourseSearch(courses);

  const onCreate = () => {
    if (!newTitle.trim()) {
      newCourseInputRef.current?.focus();
      return;
    }
    createCourse(newTitle);
    setNewTitle("");
  };

  const onDelete = (id: string) => setDeleteId(id);
  const confirmDelete = async () => {
    if (deleteId) { await deleteCourse(deleteId); setDeleteId(null); }
  };

  const onExport = (id: string) => {
    const c = loadCourse(id);
    if (!c) return;
    const blob = new Blob([exportCourseJSON(c)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${c.title || "course"}.json`;
    document.body.appendChild(a); a.click(); a.remove();
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
      a.href = url; a.download = buildScormFileName(c.title || "course");
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("SCORM export failed:", e);
    }
  };

  return (
    <>
      <AppShell
        topBar={
          <div className="flex items-center w-full gap-3">
            <span className="font-display text-[15px] font-semibold flex-1" style={{ color: "var(--ink)" }}>My Courses</span>
            <input
              className="border rounded-md px-3 py-1.5 text-xs bg-transparent outline-none"
              style={{ borderColor: "hsl(var(--border))", color: "var(--ink)", width: 200 }}
              placeholder="Search courses…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="border bg-transparent text-xs font-medium rounded-md px-3 py-1.5 transition-colors" style={{ borderColor: "hsl(var(--border))", color: "var(--text-muted)" }} onClick={() => importRef.current?.click()}>Import JSON</button>
            <button className="text-xs font-bold rounded-md px-3.5 py-1.5 border-none cursor-pointer" style={{ background: "var(--accent-hex)", color: "#0a1c18" }} onClick={() => newCourseInputRef.current?.focus()}>+ New Course</button>
          </div>
        }
      >
        <div className="px-8 py-7">
          {/* New course name input */}
          <div className="mb-6 flex items-center gap-2" style={{ borderRadius: "var(--radius-md)", background: "var(--canvas-white)", border: "1px solid hsl(var(--border))", overflow: "hidden" }}>
            <input
              ref={newCourseInputRef}
              className="flex-1 border-none bg-transparent text-sm px-3.5 py-2.5 outline-none"
              style={{ color: "var(--ink)" }}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onCreate(); }}
              placeholder="Name your new course and press Enter…"
            />
            <button className="text-xs font-bold py-2.5 px-4 border-none cursor-pointer flex-shrink-0" style={{ background: "var(--accent-hex)", color: "#0a1c18" }} onClick={onCreate}>Create →</button>
          </div>

          <div className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>{filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}</div>

          {courses.length === 0 ? (
            <EmptyState onCreateClick={() => newCourseInputRef.current?.focus()} onImportClick={() => importRef.current?.click()} />
          ) : filteredCourses.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>No courses match your search.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((c, i) => (
                <CourseCard
                  key={c.id} course={c}
                  onOpen={openCourse} onDelete={onDelete} onDuplicate={duplicateCourse}
                  onExport={onExport} onExportScorm={onExportScorm}
                  onCoverUpload={handleCoverUpload} onToggleVisibility={handleToggleVisibility}
                  uploadingCoverId={uploadingCoverId} isLoggedIn={!!user}
                  openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId}
                  animationIndex={i}
                />
              ))}
            </div>
          )}
        </div>
      </AppShell>

      <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCourse(f, () => { if (importRef.current) importRef.current.value = ""; }); }} />

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this course?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeleteId(null)} className="border-none rounded-[7px] py-2 px-[18px] font-semibold cursor-pointer text-[13px]" style={{ background: "hsl(var(--muted))", color: "var(--ink)" }}>Cancel</button>
            <button onClick={confirmDelete} className="border-none rounded-[7px] py-2 px-[18px] font-bold cursor-pointer text-[13px]" style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
