import type { Finish } from "@/lib/scoring/types";

// Reveal sequencer — a pure, tier-driven state machine. Given a card finish and
// the user's reduced-motion preference, it returns the timed phases of the
// "walkout": the card rises out of darkness, its tier glow ignites, the rare
// tiers get a burst (light + confetti + key-change), and it freezes on the
// clean hero shot (the screenshot frame). No DOM, no side effects — the React
// layer subscribes to these phases.

export type RevealPhase = "rise" | "ignite" | "burst" | "freeze";

export interface RevealStep {
  phase: RevealPhase;
  at: number; // ms offset from reveal start
}

// Tiers that earn the full spectacle (TOTY + Icon/Legend). TOTW (in-form) also
// gets a modest burst because it is, by definition, a rare "event" card.
const BURST_TIERS: ReadonlySet<Finish> = new Set<Finish>([
  "toty",
  "icon",
  "totw",
  "founder",
]);

export function hasBurst(finish: Finish): boolean {
  return BURST_TIERS.has(finish);
}

export function sequenceFor(
  finish: Finish,
  reducedMotion: boolean,
): RevealStep[] {
  // Accessibility: collapse straight to the hero frame — same payoff, no motion.
  if (reducedMotion) return [{ phase: "freeze", at: 0 }];

  const steps: RevealStep[] = [
    { phase: "rise", at: 0 },
    { phase: "ignite", at: 620 },
  ];

  if (hasBurst(finish)) {
    steps.push({ phase: "burst", at: 1040 });
    steps.push({ phase: "freeze", at: 1560 });
  } else {
    steps.push({ phase: "freeze", at: 1180 });
  }

  return steps;
}

// Total wall-clock duration of the sequence (ms) — handy for callers that want
// to know when the reveal has settled.
export function sequenceDuration(
  finish: Finish,
  reducedMotion: boolean,
): number {
  const steps = sequenceFor(finish, reducedMotion);
  return steps[steps.length - 1]?.at ?? 0;
}

export type DuelPhase =
  | { kind: "walkout" }
  | { kind: "row"; row: number } // rows 0..5 resolved up to and including `row`
  | { kind: "result" }
  | { kind: "settled" };

export interface DuelStep {
  phase: DuelPhase;
  at: number; // ms offset from reveal start
}

const DUEL_ROWS = 6;

interface MatchTiming {
  firstRowAt: number; // when the first row resolves (after the entrance lands)
  rowGap: number;
  resultGap: number; // beat between the last row and the full-time stamp
  settleGap: number;
}

// The broadcast machine both head-to-heads run on: enter, resolve the six rows
// in order, stamp full time, settle. The Duel and the Derby differ only in
// pacing, so they share the shape and bring their own clock.
function matchSequence(t: MatchTiming, reducedMotion: boolean): DuelStep[] {
  if (reducedMotion) return [{ phase: { kind: "settled" }, at: 0 }];
  const steps: DuelStep[] = [{ phase: { kind: "walkout" }, at: 0 }];
  for (let row = 0; row < DUEL_ROWS; row++) {
    steps.push({
      phase: { kind: "row", row },
      at: t.firstRowAt + row * t.rowGap,
    });
  }
  const lastRowAt = t.firstRowAt + (DUEL_ROWS - 1) * t.rowGap;
  steps.push({ phase: { kind: "result" }, at: lastRowAt + t.resultGap });
  steps.push({
    phase: { kind: "settled" },
    at: lastRowAt + t.resultGap + t.settleGap,
  });
  return steps;
}

export function duelSequenceFor(reducedMotion: boolean): DuelStep[] {
  return matchSequence(
    { firstRowAt: 1500, rowGap: 480, resultGap: 700, settleGap: 900 },
    reducedMotion,
  );
}

// The Derby runs slower than the Duel on purpose: each row is an attack the ball
// has to physically travel for (see DerbyPitch), so the gap is the ball's flight
// plus a beat to read the goal. Rushing it turns the pitch into a flicker.
export function derbySequenceFor(reducedMotion: boolean): DuelStep[] {
  return matchSequence(
    { firstRowAt: 1900, rowGap: 950, resultGap: 800, settleGap: 900 },
    reducedMotion,
  );
}

// How many stat rows are resolved (0–6) in a given phase — the scoreboard and
// the row list both render off this single number.
export function resolvedRows(phase: DuelPhase): number {
  if (phase.kind === "row") return phase.row + 1;
  if (phase.kind === "result" || phase.kind === "settled") return DUEL_ROWS;
  return 0;
}
