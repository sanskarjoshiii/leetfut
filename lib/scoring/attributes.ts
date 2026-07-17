import { STATS } from "./constants";
import type { Metric, Signals, Stats, WorkRateLevel } from "./types";

// FUT-style attributes derived purely from real LeetCode signals — no estimation.
// Each deriver returns its value plus a short, plain reason for the UI tooltip.

const Lg = (x: number) => Math.log10(Math.max(0, x) + 1);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// A real LeetCode value mapped to 0–99, log-scaled against an "elite" reference.
const score99 = (value: number, ref: number) =>
  value <= 0 ? 0 : clamp(Math.round(99 * (Lg(value) / Lg(ref))), 1, 99);

// Skill moves (1–5) = technical range: topic breadth, +1 for many languages.
export function deriveSkillMoves(s: Signals): { value: number; reason: string } {
  let value = s.topics >= 12 ? 5 : s.topics >= 8 ? 4 : s.topics >= 4 ? 3 : s.topics >= 2 ? 2 : 1;
  const bonus = s.languages >= 6 && value < 5;
  if (bonus) value += 1;
  const reason = `Technical range: ${s.topics} topic${s.topics === 1 ? "" : "s"}${
    bonus ? ` across ${s.languages} languages` : ""
  }.`;
  return { value, reason };
}

// Weak foot (1–5) = off-foot ability: how strong your WEAKER areas are (average
// of the three lowest stats), so a one-trick profile rates low.
export function deriveWeakFoot(stats: Stats): { value: number; reason: string } {
  const sorted = STATS.map((k) => stats[k]).sort((a, b) => a - b);
  const weakSide = Math.round((sorted[0] + sorted[1] + sorted[2]) / 3);
  const value = weakSide >= 72 ? 5 : weakSide >= 63 ? 4 : weakSide >= 54 ? 3 : weakSide >= 45 ? 2 : 1;
  return { value, reason: `Off-foot: your three weakest stats average ${weakSide}/99.` };
}

const rate = (v: number): WorkRateLevel => (v >= 68 ? "High" : v >= 50 ? "Med" : "Low");

// Work rate: attack = solving output (consistency + hard-solving), defense =
// discipline (accuracy).
export function deriveWorkRate(stats: Stats): { attack: WorkRateLevel; defense: WorkRateLevel; reason: string } {
  const attack = rate(Math.round((stats.pac + stats.sho) / 2));
  const defense = rate(stats.def);
  return {
    attack,
    defense,
    reason: `Attack ${attack} from solving output (streak, hard problems); defense ${defense} from acceptance rate.`,
  };
}

// Style: a one-word read of the recent solving pattern.
export function deriveStyle(s: Signals): { value: string; reason: string } {
  if (s.recent_spike) return { value: "Explosive", reason: "A recent burst well above your usual pace." };
  if (s.active_days >= 200 && s.recent_solved >= 800)
    return { value: "Relentless", reason: "Active on most days, all year round." };
  if (s.active_years >= 4 && s.contest_attended >= 20)
    return { value: "Consistent", reason: "A long, steady record of practice and contests." };
  if (s.hard_solved >= 150 && s.recent_solved < 200)
    return { value: "Clinical", reason: "A deep hard-tier back-catalogue, quieter lately." };
  if (s.recent_solved >= 300) return { value: "Industrious", reason: "Steadily solving this year." };
  return { value: "Measured", reason: "Light recent activity." };
}

interface MetricDef {
  label: string;
  unit: string;
  ref: number; // value that maps to ~99 (for the default log score)
  value: (s: Signals) => number;
  // Optional override for values that shouldn't be log-scaled (percentages,
  // contest rating). Returns the 0–99 bar directly.
  score?: (v: number) => number;
}

// Canonical metric display labels — the single source for every surface that
// looks a metric up by label (the scout report renders them; lib/duel reads
// receipts back through them). Renaming here flows everywhere at compile time.
export const METRIC_LABELS = {
  totalSolved: "Problems solved",
  hardSolved: "Hard solved",
  mediumSolved: "Medium solved",
  easySolved: "Easy solved",
  contestRating: "Contest rating",
  acceptance: "Acceptance",
  streak: "Best streak",
  topics: "Topics",
  submissions: "Submissions",
  contests: "Contests",
} as const;

// A contest rating (~1400 floor, ~3200 elite) mapped linearly to a 0–99 bar.
const ratingBar = (v: number) => (v <= 0 ? 0 : clamp(Math.round(((v - 1200) / (3200 - 1200)) * 99), 1, 99));
// A percentage (0–100) shown as itself on the 0–99 bar.
const percentBar = (v: number) => clamp(Math.round(v), 0, 99);

// Core metrics — always shown (a few zeros are fine).
const CORE_METRICS: MetricDef[] = [
  { label: METRIC_LABELS.totalSolved, unit: "solved", ref: 3_000, value: (s) => s.total_solved },
  { label: METRIC_LABELS.hardSolved, unit: "hard", ref: 600, value: (s) => s.hard_solved },
  { label: METRIC_LABELS.mediumSolved, unit: "medium", ref: 1_600, value: (s) => s.medium_solved },
  { label: METRIC_LABELS.contestRating, unit: "rating", ref: 3_200, value: (s) => s.contest_rating, score: ratingBar },
  { label: METRIC_LABELS.acceptance, unit: "%", ref: 100, value: (s) => Math.round(s.acceptance_rate), score: percentBar },
  { label: METRIC_LABELS.streak, unit: "days", ref: 365, value: (s) => s.streak },
  { label: METRIC_LABELS.topics, unit: "topics", ref: 30, value: (s) => s.topics },
  { label: METRIC_LABELS.submissions, unit: "submissions", ref: 10_000, value: (s) => s.total_submissions },
  { label: METRIC_LABELS.contests, unit: "contests", ref: 100, value: (s) => s.contest_attended },
];

// Optional metrics — appended only to make up for zeroed core ones (see below).
// Display-only, like the core metrics: they don't feed playstyles or attributes.
const OPTIONAL_METRICS: MetricDef[] = [
  { label: METRIC_LABELS.easySolved, unit: "easy", ref: 800, value: (s) => s.easy_solved },
  { label: "Languages", unit: "languages", ref: 15, value: (s) => s.languages },
  { label: "Active days", unit: "days", ref: 365, value: (s) => s.active_days },
  { label: "Badges", unit: "badges", ref: 20, value: (s) => s.badges },
  { label: "Reputation", unit: "rep", ref: 5_000, value: (s) => s.reputation },
];

const toMetric = (def: MetricDef, s: Signals): Metric => {
  const value = def.value(s);
  return { label: def.label, value, unit: def.unit, score: def.score ? def.score(value) : score99(value, def.ref) };
};

// Detail metrics: the core bars with any ZEROED ones hidden, plus one optional
// (non-zero) filler for every zeroed core metric beyond the first — so a sparse
// profile shows real data (easy solved, active days, languages…) instead of zeros.
export function deriveMetrics(s: Signals): Metric[] {
  const core = CORE_METRICS.map((d) => toMetric(d, s));
  const shown = core.filter((m) => m.value > 0); // hide zeroed core metrics
  const fillerCount = Math.max(0, core.length - shown.length - 1);
  const fillers = OPTIONAL_METRICS.map((d) => toMetric(d, s))
    .filter((m) => m.value > 0)
    .slice(0, fillerCount);
  return [...shown, ...fillers];
}
