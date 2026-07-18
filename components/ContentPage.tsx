import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Background from "./Background";
import FooterCredit from "./FooterCredit";
import FooterLinks from "./FooterLinks";
import MobileNav from "./MobileNav";

// Shared shell for the static content pages (About / FAQ / Privacy / Terms /
// Contact) — same charcoal + stadium theme as the app, a centered prose column,
// and the interlinking footer nav.
export default function ContentPage({
  kicker,
  title,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-ink">
      <Background />
      <main className="relative z-[2] mx-auto flex min-h-screen w-full max-w-[760px] flex-col px-[clamp(18px,4vw,28px)] py-[clamp(18px,3vh,28px)]">
        {/* top bar */}
        <div className="mb-[16px] flex items-center justify-between gap-3 max-[699px]:justify-end">
          <Link
            href="/"
            className="group hidden items-center gap-[6px] text-[13px] font-medium tracking-wide text-ink-faint transition hover:text-ink min-[700px]:inline-flex"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            HOME
          </Link>
          <Link href="/" aria-label="LeetFut home">
            <img src="/leetfutlogo.webp" alt="LeetFut" draggable={false} className="h-[34px] w-auto select-none rounded-[8px]" />
          </Link>
        </div>

        {/* top nav — desktop only; a hamburger drawer takes over below 700px */}
        <nav className="mb-[clamp(22px,4vh,36px)] hidden justify-center min-[700px]:flex">
          <FooterLinks />
        </nav>
        <MobileNav />

        {/* header */}
        <header className="mb-[clamp(22px,4vh,36px)]">
          <div className="font-mono mb-[10px] text-[11px] font-semibold tracking-[.3em] text-brand">{kicker}</div>
          <h1 className="font-fantasy m-0 text-[clamp(32px,6vw,56px)] font-bold leading-[1.02] tracking-[.015em]">
            {title}
          </h1>
          {updated && <p className="mt-[10px] text-[12.5px] text-ink-mute">Last updated: {updated}</p>}
        </header>

        {/* prose */}
        <div className="legal-prose flex-1">{children}</div>

        {/* footer */}
        <footer className="relative z-[2] mt-[clamp(34px,6vh,64px)] flex flex-col items-center gap-[14px] border-t border-line pt-[clamp(18px,3vh,26px)]">
          <FooterCredit />
        </footer>
      </main>
    </div>
  );
}
