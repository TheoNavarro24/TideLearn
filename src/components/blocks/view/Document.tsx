import { DocumentBlock } from "@/types/course";

const OFFICE_VIEWER = "https://view.officeapps.live.com/op/embed.aspx?src=";

export function DocumentView({ block }: { block: DocumentBlock }) {
  if (!block.src) {
    return (
      <div className="p-6 bg-[var(--canvas-white)] border border-[var(--border)] rounded-xl text-center text-slate-400 text-sm">
        No document set
      </div>
    );
  }

  const isPdf = block.fileType === "pdf";
  const embedSrc = isPdf ? block.src : `${OFFICE_VIEWER}${encodeURIComponent(block.src)}`;

  return (
    <div className="my-4">
      {block.title && (
        <p className="text-[13px] text-slate-500 mb-2 font-medium">{block.title}</p>
      )}
      <div className="border border-[var(--border)] rounded-[10px] overflow-hidden">
        <iframe
          src={embedSrc}
          className="w-full block border-none"
          style={{ height: 500 }}
          title={block.title ?? "Document"}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
