"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// Mobile-only navigation. Below 700px the inline top nav is hidden and this
// takes over: a menu button pinned top-left that slides a left sidebar in with
// the section links. Hidden entirely from 700px up (the inline nav shows there).
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="min-[700px]:hidden">
      {/* the menu button — pinned top-left */}
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed left-[14px] top-[14px] z-[45] flex h-[40px] w-[40px] items-center justify-center rounded-[11px] border border-line bg-bg-deep/70 text-ink backdrop-blur-md transition active:scale-95"
      >
        <Menu size={19} />
      </button>

      {/* drawer + backdrop */}
      <div
        className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-[min(78vw,300px)] flex-col border-r border-line bg-bg-deep/95 p-[18px] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-[22px] flex items-center justify-between">
            <img src="/leetfutlogo.webp" alt="LeetFut" draggable={false} className="h-[30px] w-auto select-none rounded-[6px]" />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-white/5 text-ink-faint transition hover:bg-white/10 hover:text-ink"
            >
              <X size={17} />
            </button>
          </div>
          <nav className="flex flex-col gap-[2px]">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-[10px] px-[14px] py-[12px] text-[16px] font-semibold text-ink-soft transition hover:bg-white/[0.05] hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
