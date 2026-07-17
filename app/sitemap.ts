import type { MetadataRoute } from "next";
import { SAMPLE_LOGINS } from "@/lib/leetcode/samples";

const BASE = "https://leetfut.com";

// Home + the showcase profiles (real, indexable example cards). Per-user pages
// are generated on demand, so they aren't enumerated here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    ...SAMPLE_LOGINS.map((login) => ({
      url: `${BASE}/${login}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
