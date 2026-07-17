"use client";

import { useEffect, useState } from "react";
import { punAt } from "@/lib/puns";

// Full-screen loading state shown while the card image is generated. The LeetFut
// logo floats above; a football-LeetCode line rotates every ~1.8s.
export default function LoadingScreen({ login }: { login?: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="relative z-[2] flex h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <img
        src="/leetfutlogo.png"
        alt="LeetFut"
        draggable={false}
        className="animate-float h-auto w-[clamp(240px,42vw,320px)] select-none rounded-[18px]"
      />

      <div className="font-display mt-8 text-[clamp(30px,5vw,52px)] leading-none tracking-[.02em] text-ink">
        SCOUTING{" "}
        {login && <span className="font-mono align-middle text-[0.5em] text-brand">@{login}</span>}
      </div>

      {/* rotating pun line */}
      <p
        key={tick}
        className="animate-pun-in mt-3 h-6 text-[15px] font-medium text-ink-soft"
        aria-live="polite"
      >
        {punAt(tick)}
      </p>

      {/* indeterminate progress sliver */}
      <div className="mt-7 h-[3px] w-[min(260px,70vw)] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent"
          style={{ animation: "gf-load 1.3s ease-in-out infinite" }}
        />
      </div>

      <style>{`@keyframes gf-load{0%{transform:translateX(-120%)}100%{transform:translateX(360%)}}`}</style>
    </main>
  );
}
