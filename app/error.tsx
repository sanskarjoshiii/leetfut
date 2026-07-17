"use client";

import { useEffect } from "react";
import Link from "next/link";
import Background from "@/components/Background";

// Route-level error boundary. Catches an unexpected throw in the route subtree —
// a bad render, or an upstream failure that isn't a clean ScoutError the page
// already handles — and shows the scout-themed fallback instead of Next's raw
// error overlay. `reset` re-renders the segment; the home link is the way out.
// Mirrors the NotScouted look on the /<user> page so a crash still feels on-brand.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaces in the server / Vercel logs; the digest ties a user-reported
    // failure to its log line.
    console.error("[leetfut] route error:", error);
  }, [error]);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-ink">
      <Background />
      <main className="relative z-[2] mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center px-6 text-center">
        <div className="font-display text-[12px] font-bold tracking-[.3em] text-brand">SCOUT REPORT</div>
        <h1 className="font-display mt-3 text-[clamp(30px,6vw,48px)] font-black leading-[.95]">The scout hit a snag</h1>
        <p className="mt-3 text-[15.5px] leading-[1.5] text-ink-soft">
          Something broke mid-scout. Try again — if it keeps happening, the pitch may be down for a moment.
        </p>
        <div className="mt-7 flex items-center gap-3">
          <button
            onClick={reset}
            className="font-display inline-flex h-[46px] items-center rounded-xl bg-brand px-6 text-[16px] tracking-[.06em] text-[#1a1305] transition hover:bg-brand-hi"
          >
            TRY AGAIN
          </button>
          <Link
            href="/"
            className="font-display inline-flex h-[46px] items-center rounded-xl border border-line px-6 text-[16px] tracking-[.06em] text-ink-soft transition hover:border-ink-soft hover:text-ink"
          >
            HOME
          </Link>
        </div>
        {error.digest && <p className="mt-6 font-mono text-[11px] tracking-wide text-ink-mute">ref: {error.digest}</p>}
      </main>
    </div>
  );
}
