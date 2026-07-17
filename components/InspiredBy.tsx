// Bottom-right corner credit — "inspired by @gitfut", linking to the original
// project this was ported from. Same type treatment as the footer credit.
const GITFUT_URL = "https://gitfut.com";

export default function InspiredBy() {
  return (
    <a
      href={GITFUT_URL}
      target="_blank"
      rel="noopener"
      // Below ~700px, pages stack full-width content (CTAs, share rows, list
      // rows) all the way down, so a `fixed` corner badge would eventually
      // drift over something tappable as the page scrolls. Below that width it
      // renders in normal flow instead — right after <main>, so it lands as its
      // own centered line under the footer credit. From 700px up, columns keep
      // a clear margin, so the floating corner badge is restored.
      className="relative z-[2] mx-auto mb-[clamp(12px,2.6vh,24px)] flex w-fit items-center gap-[5px] rounded-full bg-bg-deep/60 px-[12px] py-[7px] text-[length:clamp(9px,2.7vw,13px)] font-semibold leading-none text-ink-mute backdrop-blur-md transition hover:-translate-y-px hover:text-ink min-[700px]:fixed min-[700px]:bottom-[clamp(14px,3vh,22px)] min-[700px]:right-[clamp(14px,3vw,22px)] min-[700px]:z-40 min-[700px]:mx-0 min-[700px]:mb-0"
    >
      inspired by <span className="text-ink-dim">@gitfut</span>
    </a>
  );
}
