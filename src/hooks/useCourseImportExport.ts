import { useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { exportScorm12Zip, buildScormFileName, exportStaticWebZip, buildStaticFileName } from "@/lib/scorm12";
import { decompressFromEncodedURIComponent } from "lz-string";
import JSZip from "jszip";
import type { Course, Lesson } from "@/types/course";
import { uid } from "@/types/course";

interface UseCourseImportExportOpts {
  courseTitle: string;
  courseData: Course;
  publishUrl: string;
  importMode: "merge" | "replace";
  onApplyImport: (data: { title?: string; lessons: Lesson[] }, mode: "merge" | "replace") => void;
  onConfirmReplace: (action: () => void) => void;
}

export function useCourseImportExport({
  courseTitle,
  courseData,
  publishUrl,
  importMode,
  onApplyImport,
  onConfirmReplace,
}: UseCourseImportExportOpts) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const scormImportInputRef = useRef<HTMLInputElement>(null);

  const onImportClick = () => importInputRef.current?.click();
  const onImportScormClick = () => scormImportInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.lessons)) throw new Error("Invalid course file");
      if (importMode === "replace") {
        onConfirmReplace(() => onApplyImport({ title: data.title, lessons: data.lessons }, importMode));
        return;
      }
      onApplyImport({ title: data.title, lessons: data.lessons }, importMode);
    } catch (err) {
      toast({ title: "Import failed" });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const handleImportScormFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const zip = await JSZip.loadAsync(file);
      const courseEntry = zip.file(/(^|\/)course\.json$/i)?.[0];
      if (courseEntry) {
        const json = await courseEntry.async("text");
        const data = JSON.parse(json);
        if (!data || !Array.isArray(data.lessons)) throw new Error("Invalid course data");
        if (importMode === "replace") {
          onConfirmReplace(() => onApplyImport({ title: data.title, lessons: data.lessons }, importMode));
          return;
        }
        onApplyImport({ title: data.title, lessons: data.lessons }, importMode);
      } else {
        const indexEntry = zip.file(/index\.html$/i)?.[0] || zip.file(/\.html$/i)?.[0];
        if (!indexEntry) throw new Error("index.html not found");
        const html = await indexEntry.async("text");
        const m = html.match(/href="([^"]*\/view#[^"]+)"/i) || html.match(/src="([^"]*\/view#[^"]+)"/i);
        if (!m) throw new Error("Course URL not found");
        const url = new URL(m[1], window.location.origin);
        const hash = url.hash?.slice(1);
        if (!hash) throw new Error("Missing data hash");
        const jsonStr = decompressFromEncodedURIComponent(hash || "");
        if (!jsonStr) throw new Error("Failed to decode data");
        const data = JSON.parse(jsonStr);
        if (!data || !Array.isArray(data.lessons)) throw new Error("Invalid course data");
        if (importMode === "replace") {
          onConfirmReplace(() => onApplyImport({ title: data.title, lessons: data.lessons }, importMode));
          return;
        }
        onApplyImport({ title: data.title, lessons: data.lessons }, importMode);
      }
    } catch (err) {
      toast({ title: "SCORM import failed" });
    } finally {
      if (scormImportInputRef.current) scormImportInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (/\.json$/i.test(file.name) || file.type.includes("json")) {
      const fakeEvent = { target: { files: [file] } } as any as React.ChangeEvent<HTMLInputElement>;
      await handleImportFile(fakeEvent);
    } else if (/\.zip$/i.test(file.name) || file.type.includes("zip")) {
      const fakeEvent = { target: { files: [file] } } as any as React.ChangeEvent<HTMLInputElement>;
      await handleImportScormFile(fakeEvent);
    } else {
      toast({ title: "Unsupported file type" });
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(courseData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${courseTitle || "course"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportSCORM12 = async () => {
    try {
      const blob = await exportScorm12Zip(courseData as any, publishUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildScormFileName(courseTitle || "course");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "SCORM 1.2 package exported" });
    } catch (e) {
      toast({ title: "Export failed" });
    }
  };

  const exportStaticZip = async () => {
    try {
      const blob = await exportStaticWebZip(courseData as any, publishUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildStaticFileName(courseTitle || "course");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Static web package exported" });
    } catch (e) {
      toast({ title: "Export failed" });
    }
  };

  return {
    importInputRef,
    scormImportInputRef,
    onImportClick,
    onImportScormClick,
    handleImportFile,
    handleImportScormFile,
    handleDrop,
    exportJSON,
    exportSCORM12,
    exportStaticZip,
  };
}
