import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { getCoursesIndex, createNewCourse, deleteCourse, duplicateCourse, exportCourseJSON, renameCourse, loadCourse, migrateFromLegacy, saveCourse, loadCoursesFromCloud, deleteCourseFromCloud } from "@/lib/courses";
import { useAuth } from "@/components/auth/AuthContext";

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState(getCoursesIndex());
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = () => setCourses(getCoursesIndex());

  useEffect(() => {
    // One-time migration from legacy autosave
    const migrated = migrateFromLegacy();
    if (migrated) refresh();
  }, []);

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
      setCourses(prev => prev.filter(c => c.id !== deleteId));
      setDeleteId(null);
    }
  };
  const cancelDelete = () => setDeleteId(null);
  const onDuplicate = (id: string) => { const nid = duplicateCourse(id); if (nid) { refresh(); navigate(`/editor?courseId=${nid}`); } };
  const onExport = (id: string) => {
    const c = loadCourse(id);
    if (!c) return;
    const blob = new Blob([exportCourseJSON(c)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${c.title || "course"}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  const onRename = (id: string, title: string) => { renameCourse(id, title); refresh(); };

  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data?.lessons) throw new Error("Invalid");
      const { id } = createNewCourse(data.title || "Imported Course");
      // overwrite the content of the created course with imported data
      saveCourse(id, { schemaVersion: 1, title: data.title || "Imported Course", lessons: data.lessons });
      refresh();
      navigate(`/editor?courseId=${id}`);
    } catch (e) {
      alert("Import failed");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <main className="container mx-auto py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight">Your Courses</h1>
        <p className="text-muted-foreground">Create, open, and manage courses. Select one to start editing.</p>
      </header>

      <section className="mb-8 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="w-full sm:w-80">
          <label className="text-sm text-muted-foreground">New course title</label>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., Safety Onboarding" />
        </div>
        <div className="flex gap-2">
          <Button disabled={creating} onClick={onCreate}>New Course</Button>
          <Button variant="secondary" onClick={() => importRef.current?.click()}>Import JSON</Button>
          <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); }} />
          <a href="/editor"><Button variant="outline">Quick Draft</Button></a>
        </div>
      </section>

      <Separator className="my-6" />

      <div className="mb-6">
        <Input
          placeholder="Search courses"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.length === 0 ? (
          <p className="text-muted-foreground">No courses yet. Create one above.</p>
        ) : filteredCourses.length === 0 ? (
          <p className="text-muted-foreground">No courses match your search.</p>
        ) : (
          filteredCourses.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>
                  <EditableTitle title={c.title} onSave={(t) => onRename(c.id, t)} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Updated {new Date(c.updatedAt).toLocaleString()}</p>
              </CardContent>
              <CardFooter className="mt-auto flex gap-2">
                <Button onClick={() => onOpen(c.id)}>Open</Button>
                <Button variant="secondary" onClick={() => onDuplicate(c.id)}>Duplicate</Button>
                <Button variant="outline" onClick={() => onExport(c.id)}>Export</Button>
                <Button variant="destructive" onClick={() => onDelete(c.id)}>Delete</Button>
              </CardFooter>
            </Card>
          ))
        )}
      </section>
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this course?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={cancelDelete}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function EditableTitle({ title, onSave }: { title: string; onSave: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  useEffect(() => setValue(title), [title]);
  return editing ? (
    <div className="flex gap-2 items-center">
      <Input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onSave(value.trim() || "Untitled Course"); setEditing(false); } }} />
      <Button size="sm" variant="secondary" onClick={() => { onSave(value.trim() || "Untitled Course"); setEditing(false); }}>Save</Button>
    </div>
  ) : (
    <button className="text-left hover:underline" onClick={() => setEditing(true)}>{title}</button>
  );
}