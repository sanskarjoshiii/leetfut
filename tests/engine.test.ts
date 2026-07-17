import { describe, expect, it } from "vitest";
import { buildCard } from "@/lib/scoring/engine";
import { STATS } from "@/lib/scoring/constants";
import type { Signals } from "@/lib/scoring/types";

// FOUNDERS is empty now, so there are no forced-overall overrides to test. These
// tests pin the real scoring INVARIANTS instead: every card lands in range, the
// stats-only OVR is capped, strength beats weakness, the icon allowlist is
// honoured, and the six-stat shape steers a specialist to the right role.

const base: Signals = {
  login: "someuser",
  name: "Some User",
  avatarUrl: "https://assets.leetcode.com/users/someuser/avatar.png",
  country: null,
  total_solved: 500,
  easy_solved: 200,
  medium_solved: 250,
  hard_solved: 50,
  acceptance_rate: 55,
  total_submissions: 1500,
  contest_rating: 1500,
  contest_attended: 10,
  contest_global_rank: 10_000,
  contest_top_percent: 20,
  ranking: 100_000,
  reputation: 100,
  badges: 3,
  streak: 20,
  active_days: 80,
  active_years: 2,
  recent_solved: 200,
  recent_spike: false,
  topics: 8,
  languages: 3,
  rankedLanguages: ["Python3", "C++"],
  topLanguage: "Python3",
};

const sig = (over: Partial<Signals> = {}): Signals => ({ ...base, ...over });

const strong = sig({
  login: "elite",
  total_solved: 2600,
  easy_solved: 700,
  medium_solved: 1400,
  hard_solved: 500,
  acceptance_rate: 68,
  total_submissions: 8000,
  contest_rating: 2900,
  contest_attended: 120,
  ranking: 200,
  streak: 300,
  active_days: 340,
  active_years: 7,
  recent_solved: 1500,
  topics: 26,
  languages: 5,
});

const weak = sig({
  login: "beginner",
  total_solved: 20,
  easy_solved: 15,
  medium_solved: 5,
  hard_solved: 0,
  acceptance_rate: 30,
  total_submissions: 60,
  contest_rating: 0,
  contest_attended: 0,
  ranking: 2_000_000,
  streak: 2,
  active_days: 5,
  active_years: 1,
  recent_solved: 20,
  topics: 2,
  languages: 1,
});

describe("buildCard — range invariants", () => {
  for (const [label, s] of [
    ["strong", strong],
    ["weak", weak],
    ["baseline", base],
  ] as const) {
    it(`keeps every stat, the base OVR and the overall in range (${label})`, () => {
      const card = buildCard(s);
      for (const k of STATS) {
        expect(card.stats[k]).toBeGreaterThanOrEqual(1);
        expect(card.stats[k]).toBeLessThanOrEqual(99);
      }
      expect(card.baseOVR).toBeGreaterThanOrEqual(1);
      expect(card.baseOVR).toBeLessThanOrEqual(88); // stats alone cap at 88
      expect(card.overall).toBeGreaterThanOrEqual(1);
      expect(card.overall).toBeLessThanOrEqual(99);
      expect(card.overall).toBeGreaterThanOrEqual(card.baseOVR); // legacy only adds
    });
  }
});

describe("buildCard — strength beats weakness", () => {
  it("scores a strong profile well above a weak one", () => {
    expect(buildCard(strong).overall).toBeGreaterThan(buildCard(weak).overall);
  });

  it("gives the weak profile few or no playstyles and the strong profile several", () => {
    expect(buildCard(weak).report.playstyles.length).toBeLessThan(buildCard(strong).report.playstyles.length);
  });
});

describe("buildCard — no founders (FOUNDERS is empty)", () => {
  it("never mints a founder finish and attaches no founder meta", () => {
    for (const s of [strong, weak, base, sig({ login: "younesfdj" }), sig({ login: "mawsis" })]) {
      const card = buildCard(s);
      expect(card.finish).not.toBe("founder");
      expect(card.founder).toBeUndefined();
    }
  });
});

describe("buildCard — the icon allowlist", () => {
  it("gives neal_wu the ICON finish regardless of raw overall", () => {
    // Even a modest profile named neal_wu is force-promoted to icon.
    const card = buildCard(sig({ login: "neal_wu" }));
    expect(card.finish).toBe("icon");
    expect(card.finishLabel).toBe("ICON");
    expect(card.club).toBe("legends");
  });

  it("does not promote an ordinary login to icon on the same signals", () => {
    expect(buildCard(sig({ login: "someuser" })).finish).not.toBe("icon");
  });
});

describe("buildCard — shape steers the role", () => {
  it("reads a hard-tier grinder as HRD-led with a hard-tier archetype", () => {
    // Huge hard count with the volume that comes with it -> HRD (sho) rides high
    // and the archetype is one of the hard-tier reads (Target Man / Poacher).
    const card = buildCard(
      sig({
        login: "poacher",
        total_solved: 600,
        easy_solved: 40,
        medium_solved: 60,
        hard_solved: 500,
        acceptance_rate: 40,
        contest_rating: 0,
        topics: 4,
        languages: 2,
        streak: 10,
        active_days: 30,
      }),
    );
    expect(card.stats.sho).toBeGreaterThanOrEqual(70); // HRD rides high
    // SHO is one of the two strongest stats.
    const top2 = [...STATS].sort((a, b) => card.stats[b] - card.stats[a]).slice(0, 2);
    expect(top2).toContain("sho");
    expect(["Target Man", "Poacher"]).toContain(card.archetype);
  });

  it("gives a genuine recent spike the in-form (totw) treatment when strong enough", () => {
    const card = buildCard(sig({ ...strong, login: "informer", recent_spike: true }));
    // A recent-spike profile that clears the silver floor is IN-FORM, unless it's
    // already high enough to be TOTY/ICON — either way, never a plain gold/silver.
    expect(["totw", "toty", "icon"]).toContain(card.finish);
  });
});
