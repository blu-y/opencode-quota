type Align = "left" | "right" | "center";

function padCell(text: string, width: number, align: Align): string {
  const s = text ?? "";
  const len = s.length;
  if (len >= width) return s;
  const pad = width - len;
  if (align === "right") return " ".repeat(pad) + s;
  if (align === "center") {
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return " ".repeat(left) + s + " ".repeat(right);
  }
  return s + " ".repeat(pad);
}

function escapeCell(text: string): string {
  // Keep this conservative: tool output should be plain ascii.
  return (text ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderMarkdownTable(params: {
  headers: string[];
  rows: string[][];
  aligns?: Align[];
}): string {
  const aligns: Align[] = params.aligns ?? params.headers.map(() => "left");
  const colCount = params.headers.length;

  const safeRows = params.rows.map((r) => {
    const out: string[] = [];
    for (let i = 0; i < colCount; i++) out.push(escapeCell(r[i] ?? ""));
    return out;
  });

  const headerCells = params.headers.map((h) => escapeCell(h));

  const widths = headerCells.map((h) => Math.max(3, h.length));
  for (const row of safeRows) {
    for (let i = 0; i < colCount; i++) {
      widths[i] = Math.max(widths[i], (row[i] ?? "").length);
    }
  }

  const fmtRow = (cells: string[]) =>
    `| ${cells
      .map((c, i) => padCell(c, widths[i], aligns[i] ?? "left"))
      .join(" | ")} |`;

  const sep = `| ${widths
    .map((w, i) => {
      const a = aligns[i] ?? "left";
      if (a === "right") return "-".repeat(Math.max(3, w - 1)) + ":";
      if (a === "center") return ":" + "-".repeat(Math.max(3, w - 2)) + ":";
      return "-".repeat(Math.max(3, w));
    })
    .join(" | ")} |`;

  const lines: string[] = [];
  lines.push(fmtRow(headerCells));
  lines.push(sep);
  for (const row of safeRows) lines.push(fmtRow(row));
  return lines.join("\n");
}
