import type { Family, Finish, FounderMeta, StatKey, Stats } from "./types";

export const STATS: StatKey[] = ["pac", "sho", "pas", "dri", "def", "phy"];

// Canonical stat → display abbreviation: the single source for any surface that
// labels the six stats (the Duel's shootout rows read these). The internal keys
// stay pac/sho/pas/dri/def/phy so the FIFA position/family engine is unchanged;
// only the labels & meanings are LeetCode's:
//   pac → CNS  Consistency  (streak + active days)
//   sho → HRD  Hard mastery (hard problems solved)
//   pas → CTS  Contest      (contest rating)
//   dri → VER  Versatility  (topics + languages)
//   def → ACC  Accuracy     (acceptance rate)
//   phy → VOL  Volume       (total solved + years active)
export const STAT_LABELS: Record<StatKey, string> = {
  pac: "CNS",
  sho: "HRD",
  pas: "CTS",
  dri: "VER",
  def: "ACC",
  phy: "VOL",
};

// Longer, human-readable stat names for tooltips / the scout report.
export const STAT_NAMES: Record<StatKey, string> = {
  pac: "Consistency",
  sho: "Hard mastery",
  pas: "Contest",
  dri: "Versatility",
  def: "Accuracy",
  phy: "Volume",
};

// The attacking/technical four share sub-skills in real FUT cards (dribbling and
// pace pull from the same agility/balance traits, etc.), so they're kept cohesive
// — pulled toward their own group mean after the spike. DEF/PHY stay free: role
// explains those (attackers are simply poor defenders), so they may break away.
export const ATTACK_STATS: StatKey[] = ["pac", "sho", "pas", "dri"];

export const K = {
  // Contests needed before a contest rating counts at full weight (engine
  // .contestFactor). Attending 1/2/4 rounds ramps in only ~a tenth to a third,
  // so a strong rating from a couple of contests can't inflate the score.
  contest: { full: 12 },
  // Global-rank standing curve (engine.rankStanding): rank whose log10 == `zero`
  // scores 0; each `span` decades better adds 1 (clamped 0..1). zero 6.6 ≈ the
  // multi-million tail; roughly sub-10k saturates.
  rank: { zero: 6.6, span: 3.0 },
  // Gravity-well center from overall standing: total solved, hard solved,
  // attendance-gated contest rating, years active, earned badges (100/365-day,
  // contest & study-plan badges) and global rank (w6). b re-centers; lo/hi set
  // the band the card sits in. b is nudged to absorb the new rank term so the
  // typical card keeps its level while rank now separates top from tail.
  magnitude: { w1: 0.5, w2: 0.7, w3: 0.0009, w4: 0.08, w5: 0.25, w6: 0.9, b: -3.25, lo: 50, hi: 85 },
  tension: {
    alpha: 0.7,
    pairs: [
      ["sho", "def"],
      ["dri", "phy"],
      ["pac", "def"],
    ] as [StatKey, StatKey][],
  },
  spike: { base: 8, cohesion: 0.6 },
  // The 88→99 range is bought with sustained standing: years, contest rating,
  // total & hard solved, and badge count.
  legacy: { a: 1.0, b: 0.5, c: 0.8, d: 0.5, e: 0.4, g: 0.5, f: 6.0, activeCap: 15, bonusMax: 11 },
  ovrCap: 88,
  // The finish ladder — lowered by 5 across the board so a strong profile reaches
  // its tier sooner (each gate sits 5 below the classic threshold).
  finish: { iconMin: 85, totyMin: 80, totyLegacy: 0.5, goldMin: 70, silverMin: 60 },
  // Known competitive-programming legends who always get the ICON treatment.
  iconAllowlist: ["neal_wu"],
};

export const WEIGHTS: Record<Family, Stats> = {
  Forward: { pac: 0.2, sho: 0.3, pas: 0.1, dri: 0.2, def: 0.05, phy: 0.15 },
  Playmaker: { pac: 0.1, sho: 0.15, pas: 0.3, dri: 0.25, def: 0.1, phy: 0.1 },
  Anchor: { pac: 0.1, sho: 0.05, pas: 0.15, dri: 0.1, def: 0.4, phy: 0.2 },
};

export const FINISH_LABELS: Record<Finish, string> = {
  bronze: "BRONZE",
  silver: "SILVER",
  gold: "GOLD",
  totw: "IN-FORM",
  toty: "TOTY",
  icon: "ICON",
  founder: "FOUNDER",
};

// The people who built LeetFut. Keyed by LOWERCASE LeetCode username; matched
// case-insensitively in buildCard. Each gets a forced overall (>89), bespoke
// card art (public/cards), and an accent that tints their card + scout report.
// Empty by default — add your own LeetCode handle to claim a founder card.
export const FOUNDERS: Record<string, FounderMeta> = {};

// Forced overalls (kept beside FOUNDERS but separate so the FounderMeta shape
// stays presentation-only). Both are >89 by design.
export const FOUNDER_OVERALL: Record<string, number> = {};
