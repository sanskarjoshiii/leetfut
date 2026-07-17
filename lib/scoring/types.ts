export type StatKey = "pac" | "sho" | "pas" | "dri" | "def" | "phy";
export type Stats = Record<StatKey, number>;
export type Profile = Record<StatKey, number>;

export type Finish = "bronze" | "silver" | "gold" | "totw" | "toty" | "icon" | "founder";
export type Position = "ST" | "RW" | "CAM" | "CM" | "CDM" | "CB";
export type Family = "Forward" | "Playmaker" | "Anchor";

// The scoring inputs for one LeetCode profile. Every field traces back to a real
// number from the LeetCode API (via alfa-leetcode-api) — no estimation. The six
// FIFA-card stats are derived from these in lib/scoring/engine.
export interface Signals {
  login: string; // leetcode username
  name: string;
  avatarUrl: string;
  // Freeform country name from the LeetCode profile (e.g. "United States"), or
  // null. Resolved to a flag code in buildCard via lib/geo.
  country: string | null;

  // — Solving —
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  acceptance_rate: number; // 0–100
  total_submissions: number; // lifetime submissions (accepted + rejected)

  // — Contest —
  contest_rating: number; // 0 when the user has never entered a contest
  contest_attended: number;
  contest_global_rank: number; // 0 when none
  contest_top_percent: number; // e.g. 4.2 (%). 100 when none

  // — Standing —
  ranking: number; // global problem-solving rank (lower is better); 0 when none
  reputation: number;
  badges: number;

  // — Activity / consistency —
  streak: number; // longest run of consecutive active days (from the calendar)
  active_days: number; // total days with ≥1 submission (recent calendar window)
  active_years: number; // distinct years of activity seen
  recent_solved: number; // submissions in the recent window (this year)
  recent_spike: boolean; // a recent burst well above the usual pace

  // — Breadth —
  topics: number; // distinct skill/topic tags touched
  languages: number; // count of distinct programming languages used
  // Languages ranked by problems solved (desc); rankedLanguages[0] is the
  // most-used and drives the card's language + logo. Optional so hand-authored
  // sample Signals stay valid.
  rankedLanguages?: string[];
  topLanguage?: string | null;
}

export type WorkRateLevel = "High" | "Med" | "Low";

export interface Playstyle {
  name: string;
  icon: string; // lucide icon key, resolved in the UI (keeps lib/ framework-agnostic)
  plus: boolean; // elite "PlayStyle+" tier
  reason: string; // short, plain why-it-was-given (tooltip)
}

export interface Metric {
  label: string;
  value: number; // real LeetCode count
  unit?: string; // optional noun for the raw value, e.g. "stars"
  score: number; // 0–99 normalization of value
}

export interface Report {
  skillMoves: number; // 1–5
  weakFoot: number; // 1–5
  workRate: { attack: WorkRateLevel; defense: WorkRateLevel };
  style: string;
  // short, plain explanations for the always-shown attributes (tooltips)
  reasons: { skillMoves: string; weakFoot: string; workRate: string; style: string };
  playstyles: Playstyle[];
  metrics: Metric[];
}

export interface Archetype {
  name: string;
  blurb: string;
}

// A LeetFut founder's bespoke card treatment. Declared once (lib/scoring/constants
// FOUNDERS), resolved inside buildCard, and read by every surface (card art +
// accent, scout pill, OG accent) so the whole app tints to the right founder.
export interface FounderMeta {
  art: string; // root-relative card PNG, e.g. "/cards/founder-red.png"
  accent: string; // hex; drives the badge, pill, glow and OG accent
  ink?: string; // optional card text color override (defaults to near-white)
  label: string; // badge/pill text, e.g. "FOUNDER"
  tagline: string; // tooltip + flavor, e.g. "Co-founder of leetfut"
}

export interface Card {
  login: string;
  name: string;
  avatarUrl: string;
  // country & club are asset keys (public/badges/...), defaulted now and meant
  // to be user-editable later.
  country: string;
  club: string;
  stats: Stats;
  position: Position;
  family: Family;
  baseOVR: number;
  overall: number;
  finish: Finish;
  finishLabel: string;
  archetype: string;
  archetypeBlurb: string;
  legacy: { L: number };
  // Most-used language (by problems solved) and its resolved catalog logo.
  // topLanguage is their true #1 even when it has no logo; languageLogo is that
  // language's icon, or null if it isn't in the catalog. Both optional so
  // previously serialized cards (localStorage) stay valid.
  topLanguage?: string | null;
  languageLogo?: { name: string; slug: string } | null;
  // Set only for LeetFut founders — their bespoke card art/accent + hint metadata.
  // Optional so every other card (and previously serialized ones) stay valid.
  founder?: FounderMeta;
  report: Report;
}
