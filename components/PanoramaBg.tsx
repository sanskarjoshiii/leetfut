"use client";

import { useEffect, useRef } from "react";

// A zoomed-in still that pans with the cursor, giving a subtle "look around the
// stadium" (360-ish) parallax. The image is scaled up so there is headroom to
// travel; the pointer maps to a translate that never exceeds the overflow, so
// the edges never peek in. Transform is written straight to the element via a
// ref (one rAF-batched write per move) — no React re-render on mouse move — and
// a short transition eases each step so the motion drifts smoothly.
const SCALE = 1.2;
// Fraction of the available overflow we actually use, so an edge never shows.
const TRAVEL = 0.7;

export default function PanoramaBg() {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const overX = ((SCALE - 1) / 2) * w * TRAVEL;
      const overY = ((SCALE - 1) / 2) * h * TRAVEL;
      // Cursor right → reveal the right side (image slides left): opposite sign.
      const tx = -(e.clientX / w - 0.5) * 2 * overX;
      const ty = -(e.clientY / h - 0.5) * 2 * overY;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // translate3d keeps the image on its own GPU layer, so a hovered card's
        // transforms/filters compositing above it never repaint (flicker) this.
        el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${SCALE})`;
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <img
      ref={ref}
      src="/img_bg.jpg"
      alt=""
      aria-hidden
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
      style={{
        // translateZ(0) promotes to a stable compositing layer WITHOUT
        // `will-change` — the will-change + transform-transition combo is a known
        // Chromium flicker trigger, so we promote via the 3D transform instead.
        transform: `translateZ(0) scale(${SCALE})`,
        transformOrigin: "center",
        transition: "transform 0.14s ease-out",
        backfaceVisibility: "hidden",
      }}
    />
  );
}
