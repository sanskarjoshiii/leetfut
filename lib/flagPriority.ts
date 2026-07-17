import { normalizeCountry } from "./countries";

// The single source of truth for which flag a card shows, by priority:
//   1. override   — a manual pick (report re-select / shared-link ?country=)
//   2. leetcode     — the country derived from the LeetCode profile location
// No IP/geo fallback: a profile with no LeetCode country shows no flag, rather
// than borrowing the *viewer's* country (which is misleading on someone else's
// card). Each input is validated/normalised here, so callers can pass raw
// strings. Returns a valid lowercase alpha-2 code or null (no flag).

export function pickFlag(
  override: string | null | undefined,
  leetcode: string | null | undefined,
): string | null {
  return normalizeCountry(override) ?? normalizeCountry(leetcode);
}
