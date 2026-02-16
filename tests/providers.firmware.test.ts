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

  it("maps success into a value toast entry", async () => {
    const { queryFirmwareQuota } = await import("../src/lib/firmware.js");
    (queryFirmwareQuota as any).mockResolvedValueOnce({
      success: true,
      creditsUsd: 42.5,
      resetTimeIso: "2026-01-20T18:12:03.000Z",
    });

    const out = await firmwareProvider.fetch({ config: { toastStyle: "classic" } } as any);
    expect(out.attempted).toBe(true);
    expect(out.entries).toEqual([
      {
        kind: "value",
        name: "Firmware",
        value: "$42.50",
        resetTimeIso: "2026-01-20T18:12:03.000Z",
      },
    ]);
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
