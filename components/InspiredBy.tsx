// Bottom-right corner credit — "inspired by @gitfut", linking to the original
// project this was ported from. Same type treatment as the footer credit.
const GITFUT_URL = "https://gitfut.com";

export default function InspiredBy() {
  return (
    <a
      href={GITFUT_URL}
      target="_blank"
      rel="noopener"
      className="fixed bottom-[clamp(14px,3vh,22px)] right-[clamp(14px,3vw,22px)] z-40 inline-flex items-center gap-[5px] rounded-full bg-bg-deep/60 px-[12px] py-[7px] text-[length:clamp(9px,2.7vw,13px)] font-semibold leading-none text-ink-mute backdrop-blur-md transition hover:-translate-y-px hover:text-ink"
    >
      inspired by <span className="text-ink-dim">@gitfut</span>
    </a>
  );
}
