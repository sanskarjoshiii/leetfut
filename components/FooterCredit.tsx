// Footer credit — "built by @sanskarjoshiii", linking to the maker's GitHub.
// Shared by the home, scout-report, duel and league footers so they match.
const PROFILE_URL = "https://github.com/sanskarjoshiii";

export default function FooterCredit() {
  const link = "text-ink-dim underline-offset-2 transition hover:text-ink hover:underline";

  return (
    <div className="relative inline-flex max-w-full items-center justify-center">
      {/* weak dark fade behind the credit — soft-edged, no hard pill outline */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[-18px] inset-y-[-6px] rounded-full bg-bg-deep/70 blur-[10px]"
      />

      <div className="relative flex flex-wrap items-center justify-center gap-x-[clamp(3px,1.4vw,6px)] gap-y-[4px] text-[length:clamp(9px,2.7vw,13.5px)] font-semibold leading-none text-ink-soft">
        <span className="text-ink-mute">built by</span>
        <a href={PROFILE_URL} target="_blank" rel="noopener" className={link}>
          @sanskarjoshiii
        </a>
      </div>
    </div>
  );
}
