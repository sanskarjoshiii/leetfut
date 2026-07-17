import { describe, expect, it } from "vitest";
import { pickFlag } from "@/lib/flagPriority";

// The flag-priority contract: override → GitHub, each validated against the
// shipped flag set. There is no IP/geo fallback — an unknown country shows no
// flag rather than borrowing the viewer's.

describe("pickFlag", () => {
  it("prefers a valid override above the GitHub country", () => {
    expect(pickFlag("fr", "us")).toBe("fr");
    expect(pickFlag("FR", "us")).toBe("fr"); // normalised
  });

  it("falls back to GitHub country when there's no override", () => {
    expect(pickFlag(null, "us")).toBe("us");
    expect(pickFlag("", "us")).toBe("us");
  });

  it("skips invalid values rather than emitting them", () => {
    // invalid override → use GitHub
    expect(pickFlag("zz", "us")).toBe("us");
    // invalid override + invalid GitHub → null (no flag, never the viewer's geo)
    expect(pickFlag("zz", "eu")).toBeNull();
  });

  it("returns null when nothing valid is provided", () => {
    expect(pickFlag(null, null)).toBeNull();
    expect(pickFlag(undefined, "")).toBeNull();
  });
});
