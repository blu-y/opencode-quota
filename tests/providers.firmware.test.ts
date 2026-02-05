import { describe, expect, it, vi } from "vitest";

import { firmwareProvider } from "../src/providers/firmware.js";

vi.mock("../src/lib/firmware.js", () => ({
  queryFirmwareQuota: vi.fn(),
  hasFirmwareApiKeyConfigured: vi.fn(),
}));

describe("firmware provider", () => {
  it("returns attempted:false when not configured", async () => {
    const { queryFirmwareQuota } = await import("../src/lib/firmware.js");
    (queryFirmwareQuota as any).mockResolvedValueOnce(null);

    const out = await firmwareProvider.fetch({} as any);
    expect(out.attempted).toBe(false);
    expect(out.entries).toEqual([]);
  });

  it("maps success into a single toast entry (classic mode)", async () => {
    const { queryFirmwareQuota } = await import("../src/lib/firmware.js");
    (queryFirmwareQuota as any).mockResolvedValueOnce({
      success: true,
      percentRemaining: 58,
      resetTimeIso: "2026-01-20T18:12:03.000Z",
      windows: {
        window: { percentRemaining: 58, resetTimeIso: "2026-01-20T18:12:03.000Z" },
        weekly: { percentRemaining: 85, resetTimeIso: "2026-01-27T00:00:00.000Z" },
      },
      windowResetsRemaining: 2,
    });

    // Classic mode (default) - returns single worst window entry
    const out = await firmwareProvider.fetch({ config: { toastStyle: "classic" } } as any);
    expect(out.attempted).toBe(true);
    expect(out.entries).toEqual([
      {
        name: "Firmware",
        percentRemaining: 58,
        resetTimeIso: "2026-01-20T18:12:03.000Z",
      },
    ]);
  });

  it("maps success into grouped entries with resets remaining (grouped mode)", async () => {
    const { queryFirmwareQuota } = await import("../src/lib/firmware.js");
    (queryFirmwareQuota as any).mockResolvedValueOnce({
      success: true,
      percentRemaining: 58,
      resetTimeIso: "2026-01-20T18:12:03.000Z",
      windows: {
        window: { percentRemaining: 58, resetTimeIso: "2026-01-20T18:12:03.000Z" },
        weekly: { percentRemaining: 85, resetTimeIso: "2026-01-27T00:00:00.000Z" },
      },
      windowResetsRemaining: 2,
    });

    // Grouped mode - returns both windows with labels
    const out = await firmwareProvider.fetch({ config: { toastStyle: "grouped" } } as any);
    expect(out.attempted).toBe(true);
    expect(out.entries).toHaveLength(2);

    // Window entry with resets remaining
    expect(out.entries[0]).toEqual({
      name: "Firmware Window",
      group: "Firmware",
      label: "Window:",
      percentRemaining: 58,
      resetTimeIso: "2026-01-20T18:12:03.000Z",
      right: "2 resets",
    });

    // Weekly entry
    expect(out.entries[1]).toEqual({
      name: "Firmware Weekly",
      group: "Firmware",
      label: "Weekly:",
      percentRemaining: 85,
      resetTimeIso: "2026-01-27T00:00:00.000Z",
    });
  });

  it("omits resets right label when no resets remaining", async () => {
    const { queryFirmwareQuota } = await import("../src/lib/firmware.js");
    (queryFirmwareQuota as any).mockResolvedValueOnce({
      success: true,
      percentRemaining: 0,
      resetTimeIso: "2026-01-20T18:12:03.000Z",
      windows: {
        window: { percentRemaining: 0, resetTimeIso: "2026-01-20T18:12:03.000Z" },
        weekly: { percentRemaining: 50, resetTimeIso: "2026-01-27T00:00:00.000Z" },
      },
      windowResetsRemaining: 0,
    });

    const out = await firmwareProvider.fetch({ config: { toastStyle: "grouped" } } as any);
    expect(out.attempted).toBe(true);

    // Window entry should NOT have right label when 0 resets remaining
    expect(out.entries[0]).toEqual({
      name: "Firmware Window",
      group: "Firmware",
      label: "Window:",
      percentRemaining: 0,
      resetTimeIso: "2026-01-20T18:12:03.000Z",
    });
  });

  it("maps errors into toast errors", async () => {
    const { queryFirmwareQuota } = await import("../src/lib/firmware.js");
    (queryFirmwareQuota as any).mockResolvedValueOnce({
      success: false,
      error: "Unauthorized",
    });

    const out = await firmwareProvider.fetch({} as any);
    expect(out.attempted).toBe(true);
    expect(out.errors[0].label).toBe("Firmware");
  });
});
