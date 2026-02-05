/**
 * Firmware AI provider wrapper.
 */

import type { QuotaProvider, QuotaProviderContext, QuotaProviderResult } from "../lib/entries.js";
import { hasFirmwareApiKeyConfigured, queryFirmwareQuota } from "../lib/firmware.js";

type GroupedToastEntry = {
  name: string;
  percentRemaining: number;
  resetTimeIso?: string;
  group?: string;
  label?: string;
  right?: string;
};

export const firmwareProvider: QuotaProvider = {
  id: "firmware",

  async isAvailable(ctx: QuotaProviderContext): Promise<boolean> {
    // Best-effort: if OpenCode exposes a firmware provider, prefer that.
    // Otherwise, fallback to local auth.json presence.
    try {
      const resp = await ctx.client.config.providers();
      const ids = new Set((resp.data?.providers ?? []).map((p) => p.id));
      if (ids.has("firmware") || ids.has("firmware-ai")) return true;
    } catch {
      // ignore
    }

    return await hasFirmwareApiKeyConfigured();
  },

  matchesCurrentModel(model: string): boolean {
    const provider = model.split("/")[0]?.toLowerCase();
    if (!provider) return false;
    return provider.includes("firmware");
  },

  async fetch(_ctx: QuotaProviderContext): Promise<QuotaProviderResult> {
    const result = await queryFirmwareQuota();

    if (!result) {
      return { attempted: false, entries: [], errors: [] };
    }

    if (!result.success) {
      return {
        attempted: true,
        entries: [],
        errors: [{ label: "Firmware", message: result.error }],
      };
    }

    const style = _ctx.config.toastStyle ?? "classic";

    // Classic style: show a single entry based on the worst remaining window.
    if (style === "classic") {
      return {
        attempted: true,
        entries: [
          {
            name: "Firmware",
            percentRemaining: result.percentRemaining,
            resetTimeIso: result.resetTimeIso,
          },
        ],
        errors: [],
      };
    }

    // Grouped style: expose both windows with resets remaining.
    const entries: GroupedToastEntry[] = [];
    const group = "Firmware";

    // 5-hour window with resets remaining indicator
    const windowEntry: GroupedToastEntry = {
      name: `${group} Window`,
      group,
      label: "Window:",
      percentRemaining: result.windows.window.percentRemaining,
      resetTimeIso: result.windows.window.resetTimeIso,
    };
    // Show resets remaining on the window row
    if (result.windowResetsRemaining > 0) {
      windowEntry.right = `${result.windowResetsRemaining} reset${result.windowResetsRemaining === 1 ? "" : "s"}`;
    }
    entries.push(windowEntry);

    // Weekly
    entries.push({
      name: `${group} Weekly`,
      group,
      label: "Weekly:",
      percentRemaining: result.windows.weekly.percentRemaining,
      resetTimeIso: result.windows.weekly.resetTimeIso,
    });

    return {
      attempted: true,
      entries,
      errors: [],
    };
  },
};
