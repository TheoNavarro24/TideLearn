import { CalloutBlock } from "@/types/course";

const VARIANT = {
  info:    { borderColor: "#14b8a6", bg: "#f0fdfb", titleColor: "#0d9488" },
  success: { borderColor: "#22c55e", bg: "#f0fdf4", titleColor: "#16a34a" },
  warning: { borderColor: "#f59e0b", bg: "#fffbeb", titleColor: "#d97706" },
  danger:  { borderColor: "#ef4444", bg: "#fef2f2", titleColor: "#dc2626" },
};

export function CalloutView({ block }: { block: CalloutBlock }) {
  const v = VARIANT[block.variant] ?? VARIANT.info;
  return (
    <div
      role="note"
      aria-label={block.title ?? "Callout"}
      style={{
        borderLeft: `3px solid ${v.borderColor}`,
        background: v.bg,
        padding: "14px 18px",
        borderRadius: "0 8px 8px 0",
        margin: "24px 0",
      }}
    >
      {block.title && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: v.titleColor, letterSpacing: "0.01em" }}>
            {block.title}
          </span>
        </div>
      )}
      <div style={{ fontSize: 14, lineHeight: 1.65, color: "#334155", margin: 0 }} dangerouslySetInnerHTML={{ __html: block.text }} />
    </div>
  );
}
