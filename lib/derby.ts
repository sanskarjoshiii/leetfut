import type { Card, StatKey } from "./scoring/types";
import { METRIC_LABELS } from "./scoring/attributes";
import { STAT_LABELS, STATS } from "./scoring/constants";
import { dominanceShare, tallyRows, type DuelRow } from "./duel";

// THE DERBY — 3-a-side. Where a Duel is one card against one, a derby puts two
// squads on a pitch and settles it the same proven way: the six stats are the
// six chances, and the team with the better TEAM value takes each one.
//
// Aggregate = the squad MEAN, never the sum. Two reasons, both load-bearing:
//   1. A mean stays in the same 0–99 space a single card lives in, so the bars
//      (value/99), the row-gap tuning inside dominanceShare (FULL_ROW_GAP = 20)
//      and every visual calibrated for the Duel keep working untouched. Sums
//      would range to 297 and quietly break all three.
//   2. It's fair to short squads — a 2-player team isn't punished for turning
//      up a player light, which a sum would do brutally.

export type DerbySide = "home" | "away";

/** A squad is capped at three; the pitch is drawn for exactly this many. */
export const MAX_SQUAD = 3;

export interface DerbyRow {
  key: StatKey;
  label: string;
  /** squad mean, rounded — the team's value for this stat */
  home: number;
  away: number;
  /** Higher mean takes the chance; level means neither scores. */
  winner: DerbySide | null;
  /** index into each squad of the member who topped this stat (the scorer) */
  homeBest: number;
  awayBest: number;
}

export interface DerbyScorer {
  side: DerbySide;
  /** index into that side's squad */
  index: number;
  login: string;
  name: string;
  key: StatKey;
  /** the stat that produced the goal, e.g. "HRD" */
  label: string;
  /** the row that produced it — the pitch matches goals to attacks by this */
  row: number;
  /** the match minute it went in — the goal ticker reads this */
  minute: number;
}

export interface DerbyTeam {
  /** squad in pitch order: index 0 is the deepest player (see pitchOrder) */
  squad: Card[];
  /** highest-rated member — wears the armband and sets the kit */
  captain: Card;
  /** club name, derived from the captain */
  name: string;
  /** mean overall, rounded — the team's rating, and its penalty-shootout edge */
  rating: number;
}

export interface DerbyReceipt {
  label: string;
  home: number;
  away: number;
}

export interface Derby {
  home: DerbyTeam;
  away: DerbyTeam;
  rows: DerbyRow[];
  score: Record<DerbySide, number>;
  /** null = Draw. */
  winner: DerbySide | null;
  /** true when a level scoreline was decided by team rating (penalties). */
  onPenalties: boolean;
  /** Identical squads in both dugouts — a training match, always a Draw. */
  training: boolean;
  /** one entry per goal, in the order they went in */
  scorers: DerbyScorer[];
  /** Man of the Match — most goals on the deciding side, best rating breaks it. */
  motm: { side: DerbySide; card: Card; goals: number } | null;
  receipts: DerbyReceipt[];
}

// Team receipts aggregate per metric the way the metric actually behaves: counts
// add up across a squad, a rating or a streak does NOT (nobody's team has a
// 6000 contest rating), and a percentage averages. Getting this wrong is how a
// stats page starts lying, so each row declares its own rule.
type Agg = "sum" | "mean" | "max";

const RECEIPTS: { metric: string; label: string; agg: Agg }[] = [
  { metric: METRIC_LABELS.totalSolved, label: "Problems solved", agg: "sum" },
  { metric: METRIC_LABELS.hardSolved, label: "Hard solved", agg: "sum" },
  { metric: METRIC_LABELS.contestRating, label: "Best contest rating", agg: "max" },
  { metric: METRIC_LABELS.acceptance, label: "Acceptance %", agg: "mean" },
  { metric: METRIC_LABELS.streak, label: "Best streak", agg: "max" },
  { metric: METRIC_LABELS.submissions, label: "Submissions", agg: "sum" },
];

const metricValue = (card: Card, label: string): number =>
  card.report.metrics.find((m) => m.label === label)?.value ?? 0;

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : Math.round(xs.reduce((t, x) => t + x, 0) / xs.length);

const aggregate = (squad: Card[], metric: string, agg: Agg): number => {
  const vals = squad.map((c) => metricValue(c, metric));
  if (vals.length === 0) return 0;
  if (agg === "sum") return vals.reduce((t, v) => t + v, 0);
  if (agg === "max") return Math.max(...vals);
  return mean(vals);
};

// Index of the squad member with the highest value for a stat — the player who
// gets credited with the goal when their team takes that chance.
const bestAt = (squad: Card[], key: StatKey): number => {
  let best = 0;
  for (let i = 1; i < squad.length; i++) {
    if (squad[i].stats[key] > squad[best].stats[key]) best = i;
  }
  return best;
};

// ---- Shape ----
// The Derby borrows the Duel's tuned row-counting and dominance curve outright
// by re-labelling its rows (home → challenger, away → opponent). Deliberate
// reuse, not laziness: those two functions encode hard-won calibration (see
// lib/duel), and a second copy would drift out of agreement with it.
const asDuelRows = (rows: DerbyRow[]): DuelRow[] =>
  rows.map((r) => ({
    key: r.key,
    label: r.label,
    challenger: r.home,
    opponent: r.away,
    winner:
      r.winner === "home"
        ? "challenger"
        : r.winner === "away"
          ? "opponent"
          : null,
  }));

/** Goals per side over a set of rows — the live scoreboard's rule. */
export function tallyDerby(rows: DerbyRow[]): { home: number; away: number } {
  const { a, b } = tallyRows(asDuelRows(rows));
  return { home: a, away: b };
}

/** Home's share of the dominance bar (0–100) — the Duel's curve, team values. */
export function derbyDominance(rows: DerbyRow[]): number {
  return dominanceShare(asDuelRows(rows));
}

// ---- The pitch ----
// Deepest player first. A squad has no formation of its own, so we infer one the
// way a manager would: the Anchor drops in, the Forward pushes up, and DEF
// settles anything level (an argument for the shirt, decided by who defends).
const FAMILY_DEPTH: Record<Card["family"], number> = {
  Anchor: 0,
  Playmaker: 1,
  Forward: 2,
};

export function pitchOrder(squad: Card[]): Card[] {
  return [...squad].sort(
    (a, b) =>
      FAMILY_DEPTH[a.family] - FAMILY_DEPTH[b.family] ||
      b.stats.def - a.stats.def ||
      a.login.localeCompare(b.login),
  );
}

export interface Slot {
  /** percent across the pitch, from the HOME goal line (away mirrors to 100-x) */
  x: number;
  /** percent down the pitch */
  y: number;
}

// Home-half slots by squad size. Three is the real shape — a triangle, one in,
// two up — and the short squads keep the same spine so the pitch never looks
// broken while a team is still being typed in.
//
// The triangle is deliberately TIGHT around the centre line (y = 50): the two
// forwards sit symmetrically about it, so at rest the squad reads as one unit in
// the middle of its half rather than three players scattered over the grass.
// They only break that shape to attack (see the jostle in DerbyPitch).
const SLOTS: Record<number, Slot[]> = {
  1: [{ x: 26, y: 50 }],
  2: [
    { x: 17, y: 50 },
    { x: 36, y: 50 },
  ],
  3: [
    { x: 16, y: 50 },
    { x: 35, y: 36 },
    { x: 35, y: 64 },
  ],
};

export function slotsFor(size: number): Slot[] {
  return SLOTS[Math.max(1, Math.min(MAX_SQUAD, size))] ?? SLOTS[3];
}

// Goals land on a plausible, always-climbing clock. Not real minutes — there is
// no real clock here — just the ticker's ordering made legible.
const minuteFor = (row: number): number => 8 + row * 14;

const buildTeam = (squad: Card[]): DerbyTeam => {
  const ordered = pitchOrder(squad);
  const captain = [...ordered].sort(
    (a, b) => b.overall - a.overall || a.login.localeCompare(b.login),
  )[0];
  return {
    squad: ordered,
    captain,
    name: `${captain.login} FC`,
    rating: mean(ordered.map((c) => c.overall)),
  };
};

const sameSquad = (a: Card[], b: Card[]): boolean => {
  const key = (squad: Card[]) =>
    squad
      .map((c) => c.login.toLowerCase())
      .sort()
      .join("|");
  return key(a) === key(b);
};

export function computeDerby(homeSquad: Card[], awaySquad: Card[]): Derby {
  const home = buildTeam(homeSquad);
  const away = buildTeam(awaySquad);
  const training = sameSquad(home.squad, away.squad);

  const rows: DerbyRow[] = STATS.map((key) => {
    const h = mean(home.squad.map((c) => c.stats[key]));
    const a = mean(away.squad.map((c) => c.stats[key]));
    return {
      key,
      label: STAT_LABELS[key],
      home: h,
      away: a,
      winner: h === a ? null : h > a ? "home" : "away",
      homeBest: bestAt(home.squad, key),
      awayBest: bestAt(away.squad, key),
    };
  });

  const score = tallyDerby(rows);

  // Scoreline first; penalties (team rating) only when level; Draw when both
  // level. Identical to the Duel's rule, one tier up.
  let winner: DerbySide | null = null;
  let onPenalties = false;
  if (!training) {
    if (score.home !== score.away) {
      winner = score.home > score.away ? "home" : "away";
    } else if (home.rating !== away.rating) {
      winner = home.rating > away.rating ? "home" : "away";
      onPenalties = true;
    }
  }

  // Every goal is credited to the squad member who topped that stat: the team
  // takes the chance, but a player scores it.
  const scorers: DerbyScorer[] = rows.flatMap((r, i) => {
    if (!r.winner) return [];
    const team = r.winner === "home" ? home : away;
    const index = r.winner === "home" ? r.homeBest : r.awayBest;
    const card = team.squad[index];
    return [
      {
        side: r.winner,
        index,
        login: card.login,
        name: card.name || card.login,
        key: r.key,
        label: r.label,
        row: i,
        minute: minuteFor(i),
      },
    ];
  });

  // MOTM comes from the winning side (football's own convention); a draw opens
  // it to both. Most goals takes it, rating breaks a tie.
  const pool: DerbySide[] = winner ? [winner] : ["home", "away"];
  const candidates = pool.flatMap((side) =>
    (side === "home" ? home : away).squad.map((card) => ({
      side,
      card,
      goals: scorers.filter((s) => s.side === side && s.login === card.login)
        .length,
    })),
  );
  candidates.sort(
    (a, b) =>
      b.goals - a.goals ||
      b.card.overall - a.card.overall ||
      a.card.login.localeCompare(b.card.login),
  );
  // A goalless side has no man of the match — nobody did anything.
  const motm =
    candidates.length && candidates[0].goals > 0 ? candidates[0] : null;

  const receipts: DerbyReceipt[] = RECEIPTS.map(({ metric, label, agg }) => ({
    label,
    home: aggregate(home.squad, metric, agg),
    away: aggregate(away.squad, metric, agg),
  }));

  return {
    home,
    away,
    rows,
    score,
    winner,
    onPenalties,
    training,
    scorers,
    motm,
    receipts,
  };
}
