import type { Metadata } from "next";
import Link from "next/link";
import Background from "@/components/Background";
import Mascot from "@/components/Mascot";

export const metadata: Metadata = {
  title: "404 · Offside — LeetFut",
  robots: { index: false },
};

// The assistant referee's flag, drawn in the brand green check (not the usual
// yellow/red) so it reads as ours. The pole is vertical here — its "raised"
// final state; the flag-raise animation swings it up from the linesman's side.
function OffsideFlag() {
  return (
    <svg
      width="118"
      height="150"
      viewBox="0 0 118 150"
      fill="none"
      aria-hidden
      style={{ filter: "drop-shadow(0 6px 16px rgba(255,161,22,.35))" }}
    >
      <defs>
        <pattern id="offside-check" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="#ffa116" />
          <rect width="11" height="11" fill="#3a2a08" />
          <rect x="11" y="11" width="11" height="11" fill="#3a2a08" />
        </pattern>
      </defs>

      {/* pole */}
      <rect x="18.5" y="8" width="7" height="138" rx="3.5" fill="#b0aca6" />
      <circle cx="22" cy="10" r="5" fill="#d6d3d1" />

      {/* checkered pennant, waving toward the touchline */}
      <path
        d="M25 14 L112 26 Q116 27 112 30 L112 64 Q116 65 112 68 L25 62 Z"
        fill="url(#offside-check)"
        stroke="#3a2a08"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-ink">
      <Background />

      <main className="relative z-[2] mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center px-6 py-16 text-center">
        {/* hero — the linesman's flag swings up, the mascot looks on */}
        <div className="mb-1 flex items-end justify-center gap-2">
          <div className="animate-float">
            <div className="animate-flag-raise" style={{ transformOrigin: "bottom center" }}>
              <OffsideFlag />
            </div>
          </div>
          <Mascot size={68} className="mb-1 opacity-95" />
        </div>

        <p className="font-display text-[12px] font-bold tracking-[.3em] text-brand">FLAG ON THE PLAY</p>

        <h1 className="font-display mt-2 text-[clamp(64px,16vw,132px)] font-black leading-[.84]">
          <span aria-hidden>OFFSIDE</span>
          <span className="sr-only">Offside — 404, page not found</span>
        </h1>

        <p className="font-mono mt-2 text-[13px] font-medium tracking-[.55em] text-ink-faint">
          4 · 0 · 4
        </p>

        <p className="mt-5 max-w-[430px] text-[15.5px] leading-[1.55] text-ink-soft">
          This page strayed past the last defender — there&rsquo;s no route here on the pitch.
        </p>

        <div className="mt-8 flex flex-col items-center gap-[14px]">
          <Link
            href="/"
            className="font-display inline-flex h-[46px] items-center rounded-xl bg-brand px-7 text-[16px] tracking-[.06em] text-[#1a1305] transition hover:bg-brand-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            BACK TO THE PITCH
          </Link>
          <Link
            href="/"
            className="rounded text-[13.5px] font-medium text-ink-faint underline-offset-4 transition hover:text-brand hover:underline focus-visible:text-brand focus-visible:underline focus-visible:outline-none"
          >
            Scout a solver &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
