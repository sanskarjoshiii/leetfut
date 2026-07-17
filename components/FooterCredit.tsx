"use client";

// Footer credit — "built by" + the makers' GitHub avatars as circles. Hover a
// circle to see the handle; click to open their GitHub profile. Shared by the
// home, scout-report, duel and league footers so they match.
const BUILDERS = ["sanskarjoshiii", "akkki007", "kamranp03"];

// Neutral silhouette shown if a GitHub avatar fails to load.
const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23151412"/><circle cx="24" cy="19" r="9" fill="%23ffffff" fill-opacity="0.25"/><rect x="9" y="31" width="30" height="22" rx="11" fill="%23ffffff" fill-opacity="0.25"/></svg>',
  );
const onImgError: React.ReactEventHandler<HTMLImageElement> = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK;
};

export default function FooterCredit() {
  return (
    <div className="relative inline-flex max-w-full items-center justify-center">
      {/* weak dark fade behind the credit — soft-edged, no hard pill outline */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[-18px] inset-y-[-6px] rounded-full bg-bg-deep/70 blur-[10px]"
      />

      <div className="relative flex items-center gap-[9px] text-[length:clamp(9px,2.7vw,13.5px)] font-semibold leading-none text-ink-soft">
        <span className="text-ink-mute">built by</span>

        <div className="flex items-center gap-[7px]">
          {BUILDERS.map((handle) => (
            <a
              key={handle}
              href={`https://github.com/${handle}`}
              target="_blank"
              rel="noopener"
              aria-label={`@${handle} on GitHub`}
              className="group relative inline-flex"
            >
              <img
                src={`https://github.com/${handle}.png?size=48`}
                onError={onImgError}
                alt={`@${handle}`}
                draggable={false}
                className="h-[24px] w-[24px] rounded-full border border-white/20 object-cover transition duration-200 group-hover:-translate-y-px group-hover:border-brand group-hover:shadow-[0_0_0_3px_rgba(255,161,22,.2)]"
              />
              {/* hover tooltip — the handle, floating above the circle */}
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-[8px] -translate-x-1/2 whitespace-nowrap rounded-[7px] border border-line bg-bg-deep/95 px-[9px] py-[4px] text-[11.5px] font-semibold text-ink opacity-0 shadow-[0_10px_28px_-8px_rgba(0,0,0,.7)] backdrop-blur transition-opacity duration-150 group-hover:opacity-100">
                @{handle}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
