import { formatCount } from "../format";
import type { Playstyle, Signals } from "./types";

// A predefined catalog of LeetCode "playstyles". Each fires when its real signal
// crosses `base`; `plus` marks the elite "PlayStyle+" tier. A weak/empty profile
// crosses none, so it shows few or no playstyles — strength drives the count.
// `noun` builds the tooltip reason, e.g. "412 hard solved".
interface PlaystyleDef {
  name: string;
  icon: string; // lucide icon key, resolved in the UI
  noun: string;
  value: (s: Signals) => number;
  base: number;
  plus: number;
}

const CATALOG: PlaystyleDef[] = [
  { name: "Hard Hitter", icon: "flame", noun: "hard solved", value: (s) => s.hard_solved, base: 50, plus: 400 },
  { name: "Prolific Solver", icon: "star", noun: "problems solved", value: (s) => s.total_solved, base: 300, plus: 2_500 },
  { name: "Medium Master", icon: "target", noun: "medium solved", value: (s) => s.medium_solved, base: 200, plus: 1_200 },
  { name: "High Rated", icon: "trophy", noun: "contest rating", value: (s) => s.contest_rating, base: 1_600, plus: 2_400 },
  { name: "Contest Grinder", icon: "swords", noun: "contests attended", value: (s) => s.contest_attended, base: 10, plus: 100 },
  { name: "Sharpshooter", icon: "crosshair", noun: "% acceptance", value: (s) => s.acceptance_rate, base: 60, plus: 90 },
  { name: "Streak Keeper", icon: "zap", noun: "day best streak", value: (s) => s.streak, base: 30, plus: 200 },
  { name: "Marathoner", icon: "infinity", noun: "submissions", value: (s) => s.total_submissions, base: 1_000, plus: 15_000 },
  { name: "Explorer", icon: "compass", noun: "topics", value: (s) => s.topics, base: 8, plus: 20 },
  { name: "Polyglot", icon: "languages", noun: "languages", value: (s) => s.languages, base: 4, plus: 8 },
  { name: "Decorated", icon: "award", noun: "badges", value: (s) => s.badges, base: 3, plus: 15 },
];

const MAX_SHOWN = 8;

// Returns the qualifying playstyles, PlayStyle+ first, then by how strongly the
// profile clears each base threshold; capped so the list stays readable.
export function derivePlaystyles(s: Signals): Playstyle[] {
  return CATALOG.map((def) => ({ def, val: def.value(s) }))
    .filter(({ def, val }) => val >= def.base)
    .sort((a, b) => {
      const ap = a.val >= a.def.plus;
      const bp = b.val >= b.def.plus;
      if (ap !== bp) return ap ? -1 : 1;
      return b.val / b.def.base - a.val / a.def.base;
    })
    .slice(0, MAX_SHOWN)
    .map(({ def, val }) => ({
      name: def.name,
      icon: def.icon,
      plus: val >= def.plus,
      reason: `${formatCount(val)} ${def.noun}${val >= def.plus ? " — elite tier" : ""}.`,
    }));
}
