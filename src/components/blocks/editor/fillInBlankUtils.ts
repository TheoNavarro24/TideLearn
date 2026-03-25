type Segment = { type: "text"; value: string } | { type: "gap"; index: number };

export function parseTemplate(template: string): Segment[] {
  const parts = template.split(/({{(\d+)}})/g);
  const segments: Segment[] = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part.match(/^{{\d+}}$/)) {
      const index = parseInt(part.slice(2, -2));
      segments.push({ type: "gap", index });
      i++;
    } else if (part !== "") {
      segments.push({ type: "text", value: part });
      i++;
    } else {
      i++;
    }
  }
  return segments;
}

export function segmentsToTemplate(segments: Segment[]): string {
  return segments.map((s) => (s.type === "gap" ? `{{${s.index}}}` : s.value)).join("");
}
