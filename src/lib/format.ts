/**
 * Formatting helpers for quota toast output
 */

import type { QuotaToastEntry, QuotaToastError } from "./entries.js";
import { formatQuotaRowsGrouped, type ToastGroupEntry } from "./toast-format-grouped.js";

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function padRight(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + " ".repeat(width - str.length);
}

function padLeft(str: string, width: number): string {
  if (str.length >= width) return str.slice(str.length - width);
  return " ".repeat(width - str.length) + str;
}

function formatResetCountdown(iso?: string): string {
  if (!iso) return "-";
  const resetDate = new Date(iso);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return "reset";

  const diffMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(diffMinutes / 1440);
  const hours = Math.floor((diffMinutes % 1440) / 60);
  const minutes = diffMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}

function bar(percentRemaining: number, width: number): string {
  const p = clampInt(percentRemaining, 0, 100);
  const filled = Math.round((p / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export function formatQuotaRows(params: {
  version: string;
  layout?: {
    maxWidth: number;
    narrowAt: number;
    tinyAt: number;
  };
  entries?: QuotaToastEntry[];
  errors?: QuotaToastError[];
  style?: "classic" | "grouped";
}): string {
  if (params.style === "grouped") {
    return formatQuotaRowsGrouped({
      layout: params.layout,
      entries: params.entries as ToastGroupEntry[] | undefined,
      errors: params.errors,
    });
  }

  const layout = params.layout ?? { maxWidth: 50, narrowAt: 42, tinyAt: 32 };
  const maxWidth = layout.maxWidth;

  // Responsive columns.
  // - default: name + time on one line, then bar on next line
  // - narrow: shorter name/time cols
  // - tiny: no bars, just "Name  time  XX%"
  const isTiny = maxWidth <= layout.tinyAt;
  const isNarrow = !isTiny && maxWidth <= layout.narrowAt;

  const separator = "  ";
  const percentCol = 4; // "100%"

  const timeCol = isTiny ? 6 : isNarrow ? 7 : 7;

  // Bar width: use most of maxWidth, leaving room for separator + percent on line 2
  // Line 1 (name + time) spans exactly barWidth
  // Line 2 (bar + percent) spans barWidth + separator + percentCol
  const barWidth = Math.max(10, maxWidth - separator.length - percentCol);

  const lines: string[] = [];

  const addEntry = (name: string, resetIso: string | undefined, remaining: number) => {
    // Only show reset countdown when quota is depleted (0%)
    const timeStr = remaining === 0 ? formatResetCountdown(resetIso) : "";

    if (isTiny) {
      // In tiny mode: single line with name + time + percent
      const tinyNameCol = maxWidth - separator.length - timeCol - separator.length - percentCol;
      const line = [
        padRight(name, tinyNameCol),
        padLeft(timeStr, timeCol),
        padLeft(`${clampInt(remaining, 0, 100)}%`, percentCol),
      ].join(separator);
      lines.push(line.slice(0, maxWidth));
      return;
    }

    // Line 1: label + time (total width = barWidth only)
    // Time is right-aligned to end of bar
    const timeWidth = Math.max(timeStr.length, timeCol);
    const nameWidth = Math.max(1, barWidth - separator.length - timeWidth);
    const timeLine = padRight(name, nameWidth) + separator + padLeft(timeStr, timeWidth);
    lines.push(timeLine.slice(0, barWidth));

    // Line 2: bar + percent (percent extends beyond bar width)
    const barCell = bar(remaining, barWidth);
    const percentCell = padLeft(`${clampInt(remaining, 0, 100)}%`, percentCol);
    const barLine = [barCell, percentCell].join(separator);
    lines.push(barLine);
  };

  for (const entry of params.entries ?? []) {
    addEntry(entry.name, entry.resetTimeIso, entry.percentRemaining);
  }

  // Add error rows (rendered as "label: message")
  for (const err of params.errors ?? []) {
    lines.push(`${err.label}: ${err.message}`);
  }

  return lines.join("\n");
}
