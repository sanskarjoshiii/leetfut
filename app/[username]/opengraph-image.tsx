// OG image for the canonical /<username> URL. The route-config consts must be
// declared locally (Next forbids re-exporting them); the renderer itself is
// reused from /u/<username> so there's one source of truth.
export const runtime = "nodejs";
export const alt = "LeetFut player card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export { default } from "../u/[username]/opengraph-image";
