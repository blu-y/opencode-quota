/**
 * Firmware AI quota fetcher
 *
 * Resolves API key from multiple sources (env vars, opencode.json, auth.json)
 * and queries: https://app.firmware.ai/api/v1/quota
 */

import type { QuotaError } from "./types.js";
import { fetchWithTimeout } from "./http.js";
import {
  resolveFirmwareApiKey,
  hasFirmwareApiKey,
  getFirmwareKeyDiagnostics,
  type FirmwareKeySource,
} from "./firmware-config.js";

/** New v1 API response shape */
interface FirmwareQuotaV1Response {
  windowUsed: number; // 0-1 ratio
  windowReset: string | null;
  weeklyUsed: number; // 0-1 ratio
  weeklyReset: string;
  windowResetsRemaining: number; // 0-2
}

/** Single window quota info */
export interface FirmwareWindowQuota {
  percentRemaining: number;
  resetTimeIso?: string;
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

type FirmwareApiAuth = {
  type: "api";
  key: string;
  source: FirmwareKeySource;
};

async function readFirmwareAuth(): Promise<FirmwareApiAuth | null> {
  const result = await resolveFirmwareApiKey();
  if (!result) return null;
  return { type: "api", key: result.key, source: result.source };
}

export type FirmwareResult =
  | {
      success: true;
      /** Back-compat: worst of 5h window and weekly (for classic toast) */
      percentRemaining: number;
      resetTimeIso?: string;
      /** Individual windows for grouped display */
      windows: {
        window: FirmwareWindowQuota;
        weekly: FirmwareWindowQuota;
      };
      /** Manual resets available this week (0-2) */
      windowResetsRemaining: number;
    }
  | QuotaError
  | null;

export type FirmwareResetWindowResult =
  | { success: true; windowResetsRemaining?: number }
  | QuotaError
  | null;

const FIRMWARE_QUOTA_URL = "https://app.firmware.ai/api/v1/quota";
const FIRMWARE_RESET_WINDOW_URL = "https://app.firmware.ai/api/v1/quota/reset-window";

export async function hasFirmwareApiKeyConfigured(): Promise<boolean> {
  return await hasFirmwareApiKey();
}

export { getFirmwareKeyDiagnostics, type FirmwareKeySource } from "./firmware-config.js";

export async function queryFirmwareQuota(): Promise<FirmwareResult> {
  const auth = await readFirmwareAuth();
  if (!auth) return null;

  try {
    const resp = await fetchWithTimeout(FIRMWARE_QUOTA_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.key}`,
        "User-Agent": "OpenCode-Quota-Toast/1.0",
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return {
        success: false,
        error: `Firmware API error ${resp.status}: ${text.slice(0, 120)}`,
      };
    }

    const data = (await resp.json()) as FirmwareQuotaV1Response;

    // Parse 5-hour window
    const windowUsed = typeof data.windowUsed === "number" ? data.windowUsed : NaN;
    const windowPercentRemaining = clampPercent(100 - windowUsed * 100);
    const windowResetIso =
      typeof data.windowReset === "string" && data.windowReset.length > 0
        ? data.windowReset
        : undefined;

    // Parse weekly
    const weeklyUsed = typeof data.weeklyUsed === "number" ? data.weeklyUsed : NaN;
    const weeklyPercentRemaining = clampPercent(100 - weeklyUsed * 100);
    const weeklyResetIso =
      typeof data.weeklyReset === "string" && data.weeklyReset.length > 0
        ? data.weeklyReset
        : undefined;

    // Parse resets remaining
    const windowResetsRemaining =
      typeof data.windowResetsRemaining === "number"
        ? Math.max(0, Math.min(2, Math.round(data.windowResetsRemaining)))
        : 0;

    // Back-compat: use worst window for classic display
    const windowQuota: FirmwareWindowQuota = {
      percentRemaining: windowPercentRemaining,
      resetTimeIso: windowResetIso,
    };
    const weeklyQuota: FirmwareWindowQuota = {
      percentRemaining: weeklyPercentRemaining,
      resetTimeIso: weeklyResetIso,
    };

    // Worst window for classic mode
    const isWindowWorse = windowPercentRemaining <= weeklyPercentRemaining;
    const worst = isWindowWorse ? windowQuota : weeklyQuota;

    return {
      success: true,
      percentRemaining: worst.percentRemaining,
      resetTimeIso: worst.resetTimeIso,
      windows: {
        window: windowQuota,
        weekly: weeklyQuota,
      },
      windowResetsRemaining,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Manually reset the 5-hour spending window.
 * Consumes one of the 2 weekly resets available.
 */
export async function resetFirmwareQuotaWindow(): Promise<FirmwareResetWindowResult> {
  const auth = await readFirmwareAuth();
  if (!auth) return null;

  try {
    const resp = await fetchWithTimeout(FIRMWARE_RESET_WINDOW_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.key}`,
        "User-Agent": "OpenCode-Quota-Toast/1.0",
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      // Try to parse error JSON for better message
      try {
        const errorData = JSON.parse(text) as {
          success?: boolean;
          error?: string;
          message?: string;
        };
        if (errorData.message) {
          return {
            success: false,
            error: errorData.message,
          };
        }
      } catch {
        // Not JSON, use raw text
      }
      return {
        success: false,
        error: `Firmware API error ${resp.status}: ${text.slice(0, 120)}`,
      };
    }

    // Parse success response
    const data = (await resp.json()) as {
      success?: boolean;
      windowResetsRemaining?: number;
    };

    return {
      success: true,
      windowResetsRemaining:
        typeof data.windowResetsRemaining === "number" ? data.windowResetsRemaining : undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
