"use client";

import type { Derby, DerbySide } from "@/lib/derby";
import { slotsFor } from "@/lib/derby";
import type { Card } from "@/lib/scoring/types";
import type { ResultTheme } from "./finishTheme";
import { rgba } from "./finishTheme";

// THE DERBY's ground — a broadcast top-down pitch. Home defends the left goal,
// away the right, and every attack the shootout resolves is played out here:
// the ball flies at the conceding goal, the net ripples, the scorer celebrates.
//
// The turf is deliberately deep and desaturated rather than Sunday-league green:
// this sits inside a charcoal app, and a bright pitch would fight every tier ink
// on top of it. The kits stay the loudest thing on screen — as they should.

// The markings are drawn in a 160×90 space that matches the 16/9 frame exactly,
// so the centre circle is a true circle at every width.
const VB = { w: 160, h: 90 };
const LINE = "rgba(255,255,255,.22)";
const GOAL_MOUTH = { y: 36, h: 18 }; // both nets, in viewBox units

// Two identical celebration keyframes, alternated per attack. A player who
// scores twice running would otherwise keep the exact same animation string and
// the browser would never replay it — and keying the element instead would
// remount the avatar and flash the image. Swapping the NAME restarts it cleanly.
// The jostle is alternated for the same reason: attacks come back-to-back.
const CELEBRATE = ["derby-celebrate-a", "derby-celebrate-b"];
const JOSTLE = ["derby-jostle-a", "derby-jostle-b"];

// The strike and the break run on one clock, and it has to finish well INSIDE
// the sequencer's row gap (950ms — see derbySequenceFor). At .92s the pitch had
// 30ms at rest between attacks: the players never visibly re-formed, they just
// drifted from one attack into the next. At .7s there's a quarter-second where
// everything is genuinely still and centred, which is the whole point of the
// walk back — the shape has to be SEEN to re-form.
const ATTACK_MS = 700;

interface Jostle {
  dx: number;
  dy: number;
}

// Where a player breaks to while the ball is being played at a net. The whole
// pitch leans toward the goal under attack — the attacking side commits, the
// defending side drops back to cover it — and the two forwards pinch in on the
// ball. Everyone is walked home by the same keyframes, so the shape always
// re-forms in the middle for the restart.
//
// Offsets are percentages of the PLAYER, not the pitch, so they scale with the
// avatar and read the same on a phone as on a desktop.
const jostleFor = (side: DerbySide, attacking: DerbySide, slot: number): Jostle => ({
  dx: (attacking === "home" ? 1 : -1) * (side === attacking ? 34 : 18),
  dy: slot === 1 ? 14 : slot === 2 ? -14 : 0,
});

const AVATAR_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="%23151412"/><circle cx="60" cy="46" r="24" fill="%23ffffff" fill-opacity="0.2"/><rect x="20" y="78" width="80" height="60" rx="30" fill="%23ffffff" fill-opacity="0.2"/></svg>',
  );
const onAvatarError: React.ReactEventHandler<HTMLImageElement> = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = AVATAR_FALLBACK;
};

function Markings() {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        {/* the net — a fine mesh, only visible where a goal sits */}
        <pattern id="derby-net" width="2" height="2" patternUnits="userSpaceOnUse">
          <path d="M2 0 L0 0 0 2" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth=".22" />
        </pattern>
      </defs>
      <g fill="none" stroke={LINE} strokeWidth=".5">
        {/* touchlines */}
        <rect x="4" y="4" width="152" height="82" />
        {/* halfway line + centre circle */}
        <path d="M80 4 V86" />
        <circle cx="80" cy="45" r="11" />
        {/* penalty areas + six-yard boxes */}
        <rect x="4" y="25" width="20" height="40" />
        <rect x="4" y="36" width="8" height="18" />
        <rect x="136" y="25" width="20" height="40" />
        <rect x="148" y="36" width="8" height="18" />
        {/* the D — the arc outside each penalty area */}
        <path d="M24 37.5 A 11 11 0 0 1 24 52.5" />
        <path d="M136 37.5 A 11 11 0 0 0 136 52.5" />
        {/* corner arcs */}
        <path d="M4 6 A 2 2 0 0 0 6 4" />
        <path d="M154 4 A 2 2 0 0 0 156 6" />
        <path d="M4 84 A 2 2 0 0 1 6 86" />
        <path d="M156 84 A 2 2 0 0 1 154 86" />
      </g>
      {/* spots */}
      <g fill={LINE}>
        <circle cx="80" cy="45" r=".7" />
        <circle cx="18" cy="45" r=".7" />
        <circle cx="142" cy="45" r=".7" />
      </g>
      {/* the nets themselves, hung outside each touchline */}
      <g>
        <rect x="1" y={GOAL_MOUTH.y} width="3" height={GOAL_MOUTH.h} fill="url(#derby-net)" stroke={LINE} strokeWidth=".4" />
        <rect x="156" y={GOAL_MOUTH.y} width="3" height={GOAL_MOUTH.h} fill="url(#derby-net)" stroke={LINE} strokeWidth=".4" />
      </g>
    </svg>
  );
}

// One player on the turf: kit-ringed avatar, overall for a shirt number, name
// underneath. The captain wears the armband; the scorer of the attack just
// played celebrates.
function Man({
  card,
  x,
  y,
  kit,
  captain,
  celebrating,
  jostle,
  attack,
  dimmed,
  entered,
  delay,
}: {
  card: Card;
  x: number;
  y: number;
  kit: ResultTheme;
  captain: boolean;
  celebrating: boolean;
  /** where to break to while an attack is on; null = at rest in the middle */
  jostle: Jostle | null;
  /** which attack we're on — see CELEBRATE */
  attack: number;
  dimmed: boolean;
  entered: boolean;
  delay: number;
}) {
  return (
    <div
      // NO -translate-x/y-1/2 classes here: Tailwind v4 compiles those to the
      // standalone `translate` property, which COMPOSES with `transform` rather
      // than losing to it — together they'd centre the player twice over and sit
      // every avatar half its own height off its slot. The inline transform
      // below owns the centring alone.
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        opacity: entered ? (dimmed ? 0.72 : 1) : 0,
        transform: `translate(-50%,-50%) scale(${entered ? 1 : 0.6})`,
        transition: "opacity .6s ease, transform .6s cubic-bezier(.16,1,.3,1)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {/* The break-and-settle owns its own layer: the wrapper above holds the
          slot + entrance, this div holds the run, and the one below holds the
          scorer's jump — each a transform of its own. Stacking them means the
          run, the jump and the walk back never clobber one another. */}
      <div
        style={
          jostle
            ? ({
                animation: `${JOSTLE[attack % 2]} ${ATTACK_MS}ms cubic-bezier(.45,0,.35,1) both`,
                "--dx": `${jostle.dx}%`,
                "--dy": `${jostle.dy}%`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <div
          className="relative"
          style={{
            animation: celebrating
              ? `${CELEBRATE[attack % 2]} .8s cubic-bezier(.16,1,.3,1)`
              : undefined,
          }}
        >
          {/* the scorer's shockwave — keyed per attack so a player who scores
              twice running gets a fresh ring rather than a dead one */}
          {celebrating && (
            <span
              key={attack}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                border: `2px solid ${kit.ink}`,
                animation: "derby-shockwave .8s ease-out forwards",
              }}
            />
          )}
          <img
            src={card.avatarUrl}
            onError={onAvatarError}
            alt=""
            aria-hidden
            className="block rounded-full object-cover"
            style={{
              width: "clamp(28px, 6.2vw, 56px)",
              height: "clamp(28px, 6.2vw, 56px)",
              border: `2px solid ${kit.ink}`,
              boxShadow: `0 3px 14px -2px ${rgba(kit.ink, 0.7)}, 0 0 0 3px rgba(0,0,0,.35)`,
            }}
          />
          {/* shirt number = the overall */}
          <span
            className="font-display absolute -bottom-[5px] -right-[5px] flex items-center justify-center rounded-full px-[4px] text-[10px] leading-[14px] tabular-nums"
            style={{
              minWidth: 18,
              height: 16,
              background: kit.chip,
              color: kit.ink,
              border: `1px solid ${rgba(kit.ink, 0.55)}`,
            }}
          >
            {card.overall}
          </span>
          {captain && (
            <span
              title="Captain — the squad's best card sets the kit"
              className="font-mono absolute -left-[4px] -top-[4px] flex h-[13px] w-[13px] items-center justify-center rounded-[3px] text-[7px] font-bold"
              style={{ background: kit.ink, color: kit.chip }}
            >
              C
            </span>
          )}
          {/* The name HANGS off the avatar rather than stacking above it in
              flow: in a column the slot centres the avatar+name BLOCK, leaving
              the avatar itself half a label high of its own slot — enough to
              lift the whole formation off the centre line it should sit on. */}
          <span
            className="absolute left-1/2 top-full mt-[5px] max-w-[68px] -translate-x-1/2 truncate rounded-[4px] bg-black/45 px-[4px] text-[8.5px] font-semibold leading-[13px] text-white/85 max-[520px]:hidden"
            title={card.login}
          >
            {card.login}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DerbyPitch({
  derby,
  kits,
  shown,
  kicked,
  focus,
}: {
  derby: Derby;
  kits: { home: ResultTheme; away: ResultTheme };
  /** how many attacks have resolved (0–6) */
  shown: number;
  /** false until the walkout lands — players are still coming out */
  kicked: boolean;
  /** the winner at full time; null while live or on a draw */
  focus: DerbySide | null;
}) {
  // Nothing here is state: every beat on the pitch is a pure function of how
  // many attacks have resolved, and the motion is CSS that self-terminates. The
  // ball is thumped at the conceding net and walked back by one keyframe set,
  // so the strike can never drift out of step with the scoreline.
  const lastRow = shown > 0 ? derby.rows[shown - 1] : null;
  const scored = lastRow?.winner ?? null;
  const scorer = derby.scorers.find((s) => s.row === shown - 1);

  const side = (team: Derby["home"], which: DerbySide) => {
    const kit = kits[which];
    const slots = slotsFor(team.squad.length);
    const lost = focus !== null && focus !== which;
    return team.squad.map((card, i) => {
      const slot = slots[i] ?? slots[slots.length - 1];
      return (
        <Man
          key={card.login}
          card={card}
          // Away mirrors across the halfway line — same shape, other way round.
          x={which === "home" ? slot.x : 100 - slot.x}
          y={slot.y}
          kit={kit}
          captain={card.login === team.captain.login}
          celebrating={scorer?.side === which && scorer?.index === i}
          // At rest in the middle; only a live attack breaks the shape.
          jostle={scored ? jostleFor(which, scored, i) : null}
          attack={shown}
          dimmed={lost}
          entered={kicked}
          delay={(which === "home" ? 0 : 120) + i * 90}
        />
      );
    });
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-[14px] border border-white/10"
      style={{
        aspectRatio: "16 / 9",
        // Deep, desaturated turf + the mow stripes a groundsman leaves.
        backgroundColor: "#0e2a19",
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,.028) 0 6.25%, transparent 6.25% 12.5%), radial-gradient(120% 90% at 50% 8%, rgba(255,255,255,.09), transparent 62%)",
        boxShadow: "inset 0 0 90px rgba(0,0,0,.6)",
      }}
    >
      {/* each half is lit by the kit defending it, and flares for the winner */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 transition-opacity duration-700"
        style={{
          background: `radial-gradient(75% 80% at 12% 50%, ${kits.home.glow}, transparent 72%)`,
          opacity: 0.35 + (focus === "home" ? 0.4 : 0),
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 transition-opacity duration-700"
        style={{
          background: `radial-gradient(75% 80% at 88% 50%, ${kits.away.glow}, transparent 72%)`,
          opacity: 0.35 + (focus === "away" ? 0.4 : 0),
        }}
      />

      <Markings />

      {/* the net that just got hit ripples in the scorer's kit — home attacks
          the RIGHT goal, away the left */}
      {scored && (
        <div
          key={`net-${shown}`}
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            [scored === "home" ? "right" : "left"]: 0,
            top: `${(GOAL_MOUTH.y / VB.h) * 100}%`,
            height: `${(GOAL_MOUTH.h / VB.h) * 100}%`,
            width: "3.5%",
            background: kits[scored].ink,
            filter: "blur(3px)",
            animation: "derby-net-flash .8s ease-out both",
          }}
        />
      )}

      {side(derby.home, "home")}
      {side(derby.away, "away")}

      {/* the ball — parked on the centre spot; each strike flies it at the net
          and brings it back for the restart, on the same clock as the players
          so the pitch and the ball travel and settle together */}
      <div
        key={`ball-${shown}`}
        aria-hidden
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{
          left: "50%",
          top: "50%",
          animation: scored
            ? `${scored === "home" ? "derby-strike-right" : "derby-strike-left"} ${ATTACK_MS}ms cubic-bezier(.45,0,.35,1) both`
            : undefined,
        }}
      >
        <div
          className="rounded-full bg-white"
          style={{
            width: "clamp(7px, 1.1vw, 11px)",
            height: "clamp(7px, 1.1vw, 11px)",
            boxShadow: "0 0 10px rgba(255,255,255,.85), 0 2px 4px rgba(0,0,0,.5)",
            // Breathing on the spot, waiting for the whistle.
            animation:
              kicked && shown === 0 ? "ball-pulse 1.6s ease-in-out infinite" : undefined,
          }}
        />
      </div>

      {/* GOAL! — the broadcast's own shout, in the scorer's kit */}
      {scored && scorer && (
        <div
          key={`goal-${shown}`}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          // Fits inside a row gap: shouted, held, gone before the next attack.
          style={{ animation: "derby-goal-in .9s cubic-bezier(.16,1,.3,1) both" }}
        >
          <span
            className="font-fantasy text-[clamp(30px,7vw,64px)] leading-none"
            style={{
              color: kits[scored].ink,
              textShadow: `0 0 28px ${rgba(kits[scored].ink, 0.75)}, 0 3px 10px rgba(0,0,0,.7)`,
            }}
          >
            GOAL!
          </span>
          <span className="font-mono mt-[4px] rounded-full bg-black/60 px-[8px] py-[2px] text-[10px] tracking-[.1em] text-white/90">
            {scorer.name} · {scorer.minute}&apos;
          </span>
        </div>
      )}
    </div>
  );
}
