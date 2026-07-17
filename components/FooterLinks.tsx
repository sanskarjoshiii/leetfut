import Link from "next/link";

// Small internal-nav row for the content pages + home footer. Interlinks the
// legal/content pages so crawlers (and people) can reach them from anywhere.
const LINKS = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function FooterLinks() {
  return (
    <nav className="flex flex-wrap items-center justify-center gap-x-[10px] gap-y-[6px] text-[12px] font-medium text-ink-mute">
      {LINKS.map((l, i) => (
        <span key={l.href} className="inline-flex items-center gap-[10px]">
          <Link href={l.href} className="underline-offset-2 transition hover:text-ink hover:underline">
            {l.label}
          </Link>
          {i < LINKS.length - 1 && <span aria-hidden className="text-ink-mute/50">·</span>}
        </span>
      ))}
    </nav>
  );
}
