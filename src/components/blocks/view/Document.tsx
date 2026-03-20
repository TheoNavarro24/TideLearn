import { DocumentBlock } from "@/types/course";

const OFFICE_VIEWER = "https://view.officeapps.live.com/op/embed.aspx?src=";

export function DocumentView({ block }: { block: DocumentBlock }) {
  if (!block.src) {
    return (
      <div style={{ padding: 24, background: "#fafffe", border: "1px solid #e0fdf4", borderRadius: 12, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
        No document set
      </div>
    );
  }

  const isPdf = block.fileType === "pdf";
  const embedSrc = isPdf ? block.src : `${OFFICE_VIEWER}${encodeURIComponent(block.src)}`;

  return (
    <div style={{ margin: "16px 0" }}>
      {block.title && (
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8, fontWeight: 500 }}>{block.title}</p>
      )}
      <div style={{ border: "1px solid #e0fdf4", borderRadius: 10, overflow: "hidden" }}>
        <iframe
          src={embedSrc}
          style={{ width: "100%", height: 500, border: "none", display: "block" }}
          title={block.title ?? "Document"}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
