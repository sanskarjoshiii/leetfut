import { countryForLogin } from "../geo";
import { topLanguageLogo } from "../languages";
import { deriveMetrics, deriveSkillMoves, deriveStyle, deriveWeakFoot, deriveWorkRate } from "./attributes";
import { ATTACK_STATS, FINISH_LABELS, FOUNDER_OVERALL, FOUNDERS, K, STATS, WEIGHTS } from "./constants";
import { derivePlaystyles } from "./playstyles";
import type {
  Archetype,
  Card,
  Family,
  Finish,
  Position,
  Profile,
  Signals,
  StatKey,
  Stats,
} from "./types";

const Lg = (x: number) => Math.log10(Math.max(0, x) + 1);
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const vals = (s: Profile) => STATS.map((k) => s[k]);

// §2 — raw estimates, tuned so the six land on a comparable scale.
// pac=Consistency, sho=Hard mastery, pas=Contest, dri=Versatility,
// def=Accuracy, phy=Volume (see STAT_LABELS in constants).
function rawStats(s: Signals): Stats {
  const o: Stats = {
    // Consistency — showing up: streak length and total active days.
    pac: 30 + 10 * Lg(s.streak) + 8 * Lg(s.active_days),
    // Hard mastery — solving the hard tier, log-scaled (400 hard ≈ 87).
    sho: 30 + 22 * Lg(s.hard_solved),
    // Contest — the contest rating, mapped from a ~1400 floor. Non-contestants
    // sit at a neutral 25 rather than being zeroed into a permanent Anchor.
    pas: s.contest_rating > 0 ? 20 + (s.contest_rating - 1400) / 15 : 25,
    // Versatility — genuine range across topics and languages, sqrt-scaled so
    // breadth has diminishing returns instead of one noisy signal owning the card.
    dri: 45 + 6 * Math.sqrt(s.topics) + 3 * Math.min(s.languages, 10),
    // Accuracy — the acceptance rate (a percentage), lightly compressed.
    def: 30 + s.acceptance_rate * 0.6,
    // Volume — lifetime problems solved plus years active.
    phy: 30 + 16 * Lg(s.total_solved) + 2.2 * Math.min(s.active_years, 12),
  };
  for (const k of STATS) o[k] = clamp(Math.round(o[k]), 1, 99);
  return o;
}

// §3.1 — magnitude → gravity-well center the stats sit around. Driven by the
// signals that read as overall standing: total & hard solved, contest rating,
// and years active.
function center(s: Signals): number {
  const { w1, w2, w3, w4, w5, b, lo, hi } = K.magnitude;
  const M = sigmoid(
    w1 * Lg(s.total_solved) +
      w2 * Lg(s.hard_solved) +
      w3 * s.contest_rating +
      w4 * s.active_years +
      w5 * Lg(s.badges) +
      b,
  );
  return lerp(lo, hi, M);
}

// §3.2 — z-score of their own six.
function zscore(raw: Stats): Profile {
  const v = vals(raw);
  const m = mean(v);
  const sd = Math.sqrt(mean(v.map((x) => (x - m) ** 2))) || 1;
  const p = {} as Profile;
  STATS.forEach((k, i) => (p[k] = (v[i] - m) / sd));
  return p;
}

// §3.3 — penalise antagonist pairs so nobody is elite at everything.
function applyTension(p: Profile): Profile {
  const out = { ...p };
  for (const [a, b] of K.tension.pairs) {
    const overlap = Math.max(0, Math.min(out[a], out[b]));
    const weaker = out[a] <= out[b] ? a : b;
    out[weaker] -= K.tension.alpha * overlap;
  }
  return out;
}

// §3.4 — spike around center; specialists get spikier cards.
function spike(p: Profile, c: number): Stats {
  const v = vals(p);
  const lop = clamp((Math.max(...v) - Math.min(...v)) / 4, 0, 1);
  const spread = K.spike.base * (1 + lop);
  const m = mean(v);
  const raw = {} as Stats;
  STATS.forEach((k) => (raw[k] = c + spread * (p[k] - m)));
  // §3.5 — attacking cohesion: the technical four share sub-skills, so pull them
  // toward their own group mean (preserving order and their collective level)
  // before rounding. This kills the random-looking 18pt gaps between attacking
  // stats; DEF/PHY are left free to break away (role explains them).
  const am = mean(ATTACK_STATS.map((k) => raw[k]));
  ATTACK_STATS.forEach((k) => (raw[k] = am + K.spike.cohesion * (raw[k] - am)));
  const stats = {} as Stats;
  STATS.forEach((k) => (stats[k] = clamp(Math.round(raw[k]), 1, 99)));
  return stats;
}

function positionFromShape(st: Stats): { position: Position; family: Family } {
  const fam: Record<Family, number> = {
    Forward: st.sho + st.pac,
    Playmaker: st.pas + st.dri,
    Anchor: st.def + st.phy,
  };
  const family = (Object.keys(fam) as Family[]).sort((a, b) => fam[b] - fam[a])[0];
  const position: Position =
    family === "Forward"
      ? st.pac > st.sho
        ? "RW"
        : "ST"
      : family === "Playmaker"
        ? st.pas > st.dri
          ? "CM"
          : "CAM"
        : st.def > st.phy
          ? "CB"
          : "CDM";
  return { position, family };
}

// §3.6 — position-weighted, never a flat mean; stats alone cap at 88.
function weightedOVR(stats: Stats, family: Family): number {
  const w = WEIGHTS[family];
  const ovr = STATS.reduce((s, k) => s + stats[k] * w[k], 0);
  return Math.min(Math.round(ovr), K.ovrCap);
}

// §4 — the 88→99 range is bought with sustained standing: years active, a strong
// contest rating, and a deep back-catalogue of solved (and hard-solved) problems.
function legacyScore(s: Signals): number {
  const { a, b, c, d, e, g, f, activeCap } = K.legacy;
  const z =
    a * Math.log(s.active_years + 1) +
    b * Math.min(s.active_years, activeCap) +
    c * (s.contest_rating / 1000) +
    d * Lg(s.total_solved) +
    e * Lg(s.hard_solved) +
    g * Lg(s.badges) -
    f;
  return sigmoid(z);
}

function pickFinish(overall: number, L: number, recentSpike: boolean, login: string): Finish {
  if (K.iconAllowlist.includes(login) || overall >= K.finish.iconMin) return "icon";
  if (overall >= K.finish.totyMin && L >= K.finish.totyLegacy) return "toty";
  if (recentSpike && overall >= K.finish.silverMin) return "totw";
  if (overall >= K.finish.goldMin) return "gold";
  if (overall >= K.finish.silverMin) return "silver";
  return "bronze";
}

function archetypeFromShape(st: Stats, finish: Finish): Archetype {
  if (finish === "icon")
    return { name: "Galáctico", blurb: "hall-of-fame problem solver — high and balanced, earned over years" };
  const top = [...STATS].sort((a, b) => st[b] - st[a]);
  const peak = st[top[0]];
  const top2 = top.slice(0, 2);
  const has = (a: StatKey, b: StatKey) => top2.includes(a) && top2.includes(b);
  // pac=Consistency, sho=Hard, pas=Contest, dri=Versatility, def=Accuracy, phy=Volume.
  if (top[0] === "sho" && st.def < peak - 18 && st.pas < peak - 12)
    return { name: "Poacher", blurb: "lives in the Hard tier — a clinical finisher of the toughest problems" };
  if (top[0] === "pas" && top2.includes("def"))
    return { name: "Regista", blurb: "a contest specialist who rarely misses — precise under the clock" };
  if (top[0] === "def" && top2.includes("pas"))
    return { name: "Libero", blurb: "near-perfect acceptance with real contest pedigree" };
  if (top[0] === "dri")
    return { name: "Fantasista", blurb: "the all-rounder — comfortable across every topic and language" };
  if (has("phy", "sho")) return { name: "Target Man", blurb: "a prolific grinder who also clears the hard tier" };
  if (has("phy", "pac") || has("pac", "dri"))
    return { name: "Mezzala", blurb: "the engine — relentless daily practice across the board" };
  if (top[0] === "def")
    return { name: "Libero", blurb: "near-perfect acceptance — a disciplined, precise solver" };
  if (top[0] === "sho")
    return { name: "Poacher", blurb: "lives in the Hard tier — a clinical finisher of the toughest problems" };
  return { name: "Mezzala", blurb: "the engine — relentless daily practice across the board" };
}

export function buildCard(s: Signals): Card {
  const stats = spike(applyTension(zscore(rawStats(s))), center(s));
  const { position, family } = positionFromShape(stats);
  const baseOVR = weightedOVR(stats, family);
  const L = legacyScore(s);

  // Founders get a forced overall (>89) and the bespoke "founder" tier. We drive
  // `finish` directly rather than via pickFinish: any overall >= 90 would
  // otherwise auto-promote to ICON (and flip club/archetype), hijacking the look.
  const founder = FOUNDERS[s.login.toLowerCase()];
  const overall = founder
    ? FOUNDER_OVERALL[s.login.toLowerCase()]
    : clamp(baseOVR + Math.round(K.legacy.bonusMax * L), 1, 99);
  const finish: Finish = founder ? "founder" : pickFinish(overall, L, s.recent_spike, s.login);
  const archetype = founder
    ? { name: "Founder", blurb: "co-founder of LeetFut — they built the very scout reading this card" }
    : archetypeFromShape(stats, finish);
  const skill = deriveSkillMoves(s);
  const weak = deriveWeakFoot(stats);
  const work = deriveWorkRate(stats);
  const style = deriveStyle(s);
  // Headline language's own catalog logo (null when it has none) — never a
  // different language's icon, so the logo always matches `topLanguage`.
  const languageLogo = topLanguageLogo(s.rankedLanguages ?? []);
  return {
    login: s.login,
    name: s.name,
    avatarUrl: s.avatarUrl,
    country: countryForLogin(s.login, s.country) ?? "",
    club: finish === "icon" ? "legends" : "neutral",
    stats,
    position,
    family,
    baseOVR,
    overall,
    finish,
    finishLabel: FINISH_LABELS[finish],
    archetype: archetype.name,
    archetypeBlurb: archetype.blurb,
    topLanguage: s.topLanguage ?? null,
    languageLogo,
    ...(founder ? { founder } : null),
    legacy: { L },
    report: {
      skillMoves: skill.value,
      weakFoot: weak.value,
      workRate: { attack: work.attack, defense: work.defense },
      style: style.value,
      reasons: {
        skillMoves: skill.reason,
        weakFoot: weak.reason,
        workRate: work.reason,
        style: style.reason,
      },
      playstyles: derivePlaystyles(s),
      metrics: deriveMetrics(s),
    },
  };
}
