// Public origin of this deployment — the single source for every outward-facing
// URL (share links, sitemap, robots, JSON-LD, OG footers). Configure via
// NEXT_PUBLIC_SITE_URL; the leetfut.tech fallback keeps forks/dev working unset.
// NEXT_PUBLIC_* is inlined at build time, so this works in client modules
// (lib/share.ts) as well as on the server.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://leetfut.tech").replace(/\/+$/, "");

// Bare host for display copy (OG-image footers): "leetfut.tech".
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
