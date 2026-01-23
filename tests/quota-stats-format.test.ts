import { describe, expect, it } from "vitest";
import { formatQuotaStatsReport } from "../src/lib/quota-stats-format.js";
import type { AggregateResult } from "../src/lib/quota-stats.js";

function makeEmptyResult(overrides?: Partial<AggregateResult>): AggregateResult {
  return {
    window: { sinceMs: 0, untilMs: 1 },
    totals: {
      priced: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 },
      unknown: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 },
      costUsd: 0,
      messageCount: 0,
      sessionCount: 0,
    },
    bySourceProvider: [],
    bySourceModel: [],
    byModel: [],
    bySession: [],
    unknown: [],
    ...overrides,
  };
}

describe("formatQuotaStatsReport (markdown)", () => {
  it("renders a markdown table for models with separator rows", () => {
    const r = makeEmptyResult({
      totals: {
        priced: { input: 1000, output: 2000, reasoning: 0, cache_read: 0, cache_write: 0 },
        unknown: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 },
        costUsd: 1.23,
        messageCount: 2,
        sessionCount: 1,
      },
      bySourceModel: [
        {
          sourceProviderID: "opencode",
          sourceModelID: "claude-opus-4-5-high",
          tokens: { input: 1000, output: 2000, reasoning: 0, cache_read: 0, cache_write: 0 },
          costUsd: 1.23,
          messageCount: 2,
        },
        {
          sourceProviderID: "cursor",
          sourceModelID: "gpt-5.2",
          tokens: { input: 10, output: 20, reasoning: 0, cache_read: 0, cache_write: 0 },
          costUsd: 0.01,
          messageCount: 1,
        },
      ],
    });

    const out = formatQuotaStatsReport({ title: "Quota Daily", result: r, topModels: 99 });
    expect(out).toContain("# Quota Daily");
    expect(out).toContain("## Models");
    expect(out).toContain("| Source");
    // blank separator row between sources
    expect(out).toContain("|          |");
    expect(out).toContain("OpenCode");
    expect(out).toContain("Cursor");
  });

  it("omits Reasoning column when all reasoning is zero", () => {
    const r = makeEmptyResult({
      totals: {
        priced: { input: 1, output: 1, reasoning: 0, cache_read: 0, cache_write: 0 },
        unknown: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 },
        costUsd: 0,
        messageCount: 1,
        sessionCount: 1,
      },
      bySourceModel: [
        {
          sourceProviderID: "opencode",
          sourceModelID: "gpt-5.2",
          tokens: { input: 1, output: 1, reasoning: 0, cache_read: 0, cache_write: 0 },
          costUsd: 0,
          messageCount: 1,
        },
      ],
    });

    const out = formatQuotaStatsReport({ title: "Quota Daily", result: r, topModels: 99 });
    expect(out).not.toContain("Reasoning");
  });
});
