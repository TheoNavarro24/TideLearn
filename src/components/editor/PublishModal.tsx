import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Package, Globe, FileJson } from "lucide-react";
import type { BlockWarning } from "@/lib/validate-blocks";

interface PublishModalProps {
  publishUrl: string;
  courseTitle: string;
  hashSize: number;
  onClose: () => void;
  onCopy: (text: string, label?: string) => void;
  onExportJSON: () => void;
  onExportSCORM12: () => void;
  onExportStaticZip: () => void;
  showImport: boolean;
  onToggleImport: () => void;
  importMode: "merge" | "replace";
  setImportMode: (m: "merge" | "replace") => void;
  onImportClick: () => void;
  onImportScormClick: () => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  hasAssessments: boolean;
  warnings: BlockWarning[];
  isPublished: boolean;
}

export function PublishModal({
  publishUrl,
  courseTitle,
  hashSize,
  onClose,
  onCopy,
  onExportJSON,
  onExportSCORM12,
  onExportStaticZip,
  showImport,
  onToggleImport,
  importMode,
  setImportMode,
  onImportClick,
  onImportScormClick,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  hasAssessments,
  warnings,
  isPublished,
}: PublishModalProps) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Teal stripe */}
        <div className="h-[3px] bg-gradient-to-br from-[var(--teal-primary)] to-[var(--teal-cyan)]" />

        {/* Modal top */}
        <div className="px-8 pt-7 pb-6">
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-amber-500 rounded-lg p-3 px-4 mb-4">
              <p className="font-semibold text-[13px] text-amber-800 mb-2">
                ⚠ {warnings.reduce((n, w) => n + w.issues.length, 0)} issue{warnings.reduce((n, w) => n + w.issues.length, 0) !== 1 ? "s" : ""} found:
              </p>
              <ul className="m-0 pl-5 text-xs text-amber-900">
                {warnings.map((w, i) =>
                  w.issues.map((issue, j) => (
                    <li key={`${i}-${j}`}>
                      Lesson "{w.lessonTitle}", block {w.blockIndex + 1} ({w.blockType}): {issue}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {/* Success circle */}
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[var(--teal-primary)] to-[var(--teal-cyan)] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Title */}
          <DialogTitle className="font-display text-[22px] font-bold text-[var(--text-primary)] mb-1.5">
            {isPublished ? "Your course is published" : "Ready to share"}
          </DialogTitle>
          <p className="text-[13px] text-[var(--text-muted)] mb-5">
            <strong>{courseTitle}</strong> is published and ready to share.
          </p>

          {/* Large URL warning */}
          {hashSize > 100000 && (
            <div className="bg-yellow-50 border border-amber-400 rounded-md px-3 py-2 mb-3 text-xs text-amber-800">
              Large course: link is {hashSize.toLocaleString()} chars. Use Export JSON for better portability.
            </div>
          )}

          {/* Share link row */}
          <div className="mb-1">
            <div className="text-[9px] font-extrabold text-[var(--teal-primary)] uppercase tracking-wider mb-1.5">
              Share Link
            </div>
            <div className="flex border-[1.5px] border-[var(--border-mid)] rounded-lg overflow-hidden">
              <input
                value={publishUrl}
                readOnly
                className="flex-1 border-none outline-none text-xs font-mono px-3 py-2 text-[var(--text-body)] bg-[var(--surface-subtle)] min-w-0"
              />
              <button
                onClick={() => onCopy(publishUrl, "URL copied!")}
                className="bg-gradient-to-br from-[var(--teal-primary)] to-[var(--teal-cyan)] border-none text-white text-xs font-bold px-4 cursor-pointer whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-8 mb-5">
          <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">Export for offline &amp; LMS</span>
          <div className="flex-1 h-px bg-[var(--border-subtle)]" />
        </div>

        {/* Export grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 px-8 pb-6">
          {[
            {
              icon: <Package className="w-5 h-5 text-[var(--teal-primary)]" />,
              iconBg: "bg-green-50",
              label: "SCORM 1.2",
              desc: "Upload to any LMS",
              action: "Export .zip →",
              onClick: onExportSCORM12,
            },
            {
              icon: <Globe className="w-5 h-5 text-[var(--teal-primary)]" />,
              iconBg: "bg-blue-50",
              label: "HTML Export",
              desc: "Self-hosted web package",
              action: "Download .html →",
              onClick: onExportStaticZip,
            },
            {
              icon: <FileJson className="w-5 h-5 text-[var(--teal-primary)]" />,
              iconBg: "bg-orange-50",
              label: "Course JSON",
              desc: "Portable course data",
              action: "Download .json →",
              onClick: onExportJSON,
            },
          ].map(card => (
            <div
              key={card.label}
              className="bg-[var(--surface-subtle)] border-[1.5px] border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-3 flex flex-col gap-1.5"
            >
              <div className={`w-8 h-8 ${card.iconBg} rounded-md flex items-center justify-center`}>
                {card.icon}
              </div>
              <div className="text-xs font-bold text-[var(--text-primary)]">{card.label}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{card.desc}</div>
              <button
                onClick={card.onClick}
                className="bg-none border-none text-[11px] text-[var(--teal-primary)] font-semibold cursor-pointer p-0 text-left mt-auto hover:underline focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none rounded"
              >
                {card.action}
              </button>
            </div>
          ))}
        </div>

        {/* Assessment export note */}
        {hasAssessments && (
          <p className="text-[11px] text-[var(--text-muted)] mx-8 mt-2">
            Assessment lessons are not included in exported packages.
          </p>
        )}

        {/* Import section (collapsible) */}
        {showImport && (
          <div className="border-t border-[var(--border-subtle)] px-8 py-4 pb-5">
            <div className="text-[11px] font-bold text-[var(--text-primary)] mb-2.5">Import course</div>

            {/* Import mode */}
            <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as any)} className="flex gap-6 mb-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="mode-replace" />
                <Label htmlFor="mode-replace" className="text-xs">Replace current course</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merge" id="mode-merge" />
                <Label htmlFor="mode-merge" className="text-xs">Merge (append lessons)</Label>
              </div>
            </RadioGroup>

            {/* Drop zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-lg p-4 text-center mb-2.5 transition-colors ${
                isDragOver
                  ? "border-[var(--teal-primary)] bg-[var(--surface-tint)]"
                  : "border-[var(--border-emphasis)] bg-[var(--surface-subtle)]"
              }`}
            >
              <p className="text-xs text-[var(--text-muted)] m-0">Drag &amp; drop a .json or .zip (SCORM) file here</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onImportClick}
                className="bg-none border-[1.5px] border-[var(--border-emphasis)] rounded-md text-[var(--teal-primary)] text-xs font-semibold px-3 py-1.5 cursor-pointer"
              >
                Import JSON
              </button>
              <button
                onClick={onImportScormClick}
                className="bg-none border-[1.5px] border-[var(--border-emphasis)] rounded-md text-[var(--teal-primary)] text-xs font-semibold px-3 py-1.5 cursor-pointer"
              >
                Import SCORM .zip
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] px-8 py-3 flex items-center justify-between">
          <button
            onClick={onToggleImport}
            className="bg-none border-none text-xs text-[var(--text-muted)] cursor-pointer p-0 hover:text-[var(--teal-primary)] transition-colors"
          >
            {showImport ? "Hide import" : "Import course"}
          </button>
          <button
            onClick={onClose}
            className="bg-none border-none text-[13px] font-semibold text-[var(--teal-primary)] cursor-pointer px-3.5 py-1.5 rounded-md hover:bg-[var(--surface-tint)] transition-colors"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
