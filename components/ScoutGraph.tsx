import type { ScoutHistoryPoint } from "@/lib/analytics";

// Minimal home-hero sparkline of the distinct-scout total over the last 30 days.
// Sits below the card fan, above the inspired-by badge. One brand-hue series on
// the dark surface — no legend, no axes; the live tally in ScoutForm is the
// number, this is just its shape. Pure SVG (no client JS): hover detail comes
// from native <title> tooltips on invisible per-day hit columns.

const W = 260;
const H = 44;
const PAD = 3; // keeps the 2px round-capped stroke + end dot inside the viewBox

// Catmull-Rom → cubic bezier, so the line bends through the points as one
// continuous curve (the "circular edges") instead of sharp polyline corners.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function ScoutGraph({ history }: { history: ScoutHistoryPoint[] | null }) {
  if (!history || history.length < 2) return null;

  const totals = history.map((p) => p.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  // A brand-new flat series still draws as a line rather than dividing by zero.
  const span = Math.max(max - min, 1);

  const pts = history.map((p, i) => ({
    x: PAD + (i / (history.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (p.total - min) / span) * (H - PAD * 2),
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  const last = pts[pts.length - 1];
  const colW = (W - PAD * 2) / (history.length - 1);

  const label = (p: ScoutHistoryPoint) =>
    `${new Date(`${p.day}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })} — ${p.total.toLocaleString("en-US")} scouted`;

  return (
    // Mirrors InspiredBy's placement rules on the opposite corner: fixed
    // bottom-LEFT from 700px up; below that it stays in normal flow (centered
    // under the cards) so it never floats over tappable full-width content.
    <div className="relative z-[2] mx-auto flex w-fit max-w-full flex-col items-center gap-[8px] rounded-[26px] bg-bg-deep/60 px-[26px] pb-[13px] pt-[14px] backdrop-blur-md min-[700px]:fixed min-[700px]:bottom-[clamp(14px,3vh,22px)] min-[700px]:left-[clamp(14px,3vw,22px)] min-[700px]:z-40 min-[700px]:mx-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[44px] w-[min(260px,72vw)]"
        role="img"
        aria-label={`Cards rated over the last ${history.length} days, growing to ${max.toLocaleString("en-US")}`}
      >
        <defs>
          <linearGradient id="scout-graph-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#scout-graph-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* current-value end dot, ringed with the surface so it sits on the line */}
        <circle cx={last.x} cy={last.y} r="4.5" fill="var(--color-bg-deep)" />
        <circle cx={last.x} cy={last.y} r="3" fill="var(--color-brand-hi)" />
        {/* invisible per-day hit columns -> native tooltips, no client JS */}
        {history.map((p, i) => (
          <rect
            key={p.day}
            x={PAD + i * colW - colW / 2}
            y={0}
            width={colW}
            height={H}
            fill="transparent"
          >
            <title>{label(p)}</title>
          </rect>
        ))}
      </svg>
      <span className="inline-flex items-baseline gap-[6px] leading-none">
        <span className="font-display text-[17px] leading-none text-ink">
          {max.toLocaleString("en-US")}
        </span>
        <span className="text-[10.5px] font-semibold leading-none text-ink-mute">
          users scouted · last 30 days
        </span>
      </span>
    </div>
  );
}
