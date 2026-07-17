// Canonical scout route: leetfut.com/<username>. The implementation lives in
// /u/<username> (kept working for older shared links); this reuses it from one
// source of truth. Route-segment config (`dynamic`) must be declared here —
// Next forbids re-exporting it — while the handlers can be re-exported.
export const dynamic = "force-dynamic";
export { default, generateMetadata } from "../u/[username]/page";
