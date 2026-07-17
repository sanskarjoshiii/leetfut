import { describe, expect, it } from "vitest";
import { derivePlaystyles } from "@/lib/scoring/playstyles";
import type { Signals } from "@/lib/scoring/types";

// Playstyles are earned, not assigned: each fires only when a real signal crosses
// its threshold, so a weak profile shows none. The tests pin the three decisions
// that make the panel — WHICH fire (>= base), WHICH are elite (>= plus), and in
// WHAT ORDER they're shown (elite first, then by how far past base they are).

// Deliberately below every base threshold: this profile earns nothing.
const quiet: Signals = {
  login: "octocat",
  name: "The Octocat",
  avatarUrl: "https://assets.leetcode.com/users/octocat/avatar.png",
  country: null,
  total_solved: 100,
  easy_solved: 40,
  medium_solved: 50,
  hard_solved: 10,
  acceptance_rate: 40,
  total_submissions: 200,
  contest_rating: 0,
  contest_attended: 2,
  contest_global_rank: 0,
  contest_top_percent: 100,
  ranking: 500_000,
  reputation: 0,
  badges: 1,
  streak: 10,
  active_days: 20,
  active_years: 1,
  recent_solved: 50,
  recent_spike: false,
  topics: 3,
  languages: 2,
  rankedLanguages: ["Python3"],
  topLanguage: "Python3",
};

const signals = (over: Partial<Signals> = {}): Signals => ({ ...quiet, ...over });
const names = (s: Signals) => derivePlaystyles(s).map((p) => p.name);

describe("derivePlaystyles — qualifying", () => {
  it("gives a quiet profile no playstyles at all", () => {
    expect(derivePlaystyles(quiet)).toEqual([]);
  });

  it("fires exactly on the base threshold (>=, not >)", () => {
    expect(names(signals({ hard_solved: 49 }))).not.toContain("Hard Hitter");
    expect(names(signals({ hard_solved: 50 }))).toContain("Hard Hitter");
  });

  it("awards each playstyle from its own signal", () => {
    expect(names(signals({ hard_solved: 50 }))).toContain("Hard Hitter");
    expect(names(signals({ total_solved: 300 }))).toContain("Prolific Solver");
    expect(names(signals({ medium_solved: 200 }))).toContain("Medium Master");
    expect(names(signals({ contest_rating: 1600 }))).toContain("High Rated");
    expect(names(signals({ contest_attended: 10 }))).toContain("Contest Grinder");
    expect(names(signals({ acceptance_rate: 60 }))).toContain("Sharpshooter");
    expect(names(signals({ streak: 30 }))).toContain("Streak Keeper");
    expect(names(signals({ total_submissions: 1_000 }))).toContain("Marathoner");
    expect(names(signals({ topics: 8 }))).toContain("Explorer");
    expect(names(signals({ languages: 4 }))).toContain("Polyglot");
    expect(names(signals({ badges: 3 }))).toContain("Decorated");
  });
});

describe("derivePlaystyles — the elite (PlayStyle+) tier", () => {
  it("marks plus only at the elite threshold", () => {
    const [under] = derivePlaystyles(signals({ streak: 199 }));
    expect(under).toMatchObject({ name: "Streak Keeper", plus: false });

    const [over] = derivePlaystyles(signals({ streak: 200 }));
    expect(over).toMatchObject({ name: "Streak Keeper", plus: true });
  });

  it("sorts every plus above every non-plus", () => {
    // Polyglot is elite (8 languages); Prolific Solver clears base but isn't.
    const out = derivePlaystyles(signals({ languages: 8, total_solved: 300 }));
    expect(out.map((p) => p.name)).toEqual(["Polyglot", "Prolific Solver"]);
    expect(out.map((p) => p.plus)).toEqual([true, false]);
  });

  it("ranks non-plus playstyles by how far past base they are", () => {
    // Prolific at 3x base outranks Hard Hitter at 2x.
    const out = names(signals({ total_solved: 900, hard_solved: 100 }));
    expect(out).toEqual(["Prolific Solver", "Hard Hitter"]);
  });
});

describe("derivePlaystyles — the shown list", () => {
  // Clears all 11 base thresholds; only 8 may be shown.
  const everything = signals({
    hard_solved: 200,
    total_solved: 1500,
    medium_solved: 800,
    contest_rating: 2000,
    contest_attended: 50,
    acceptance_rate: 80,
    streak: 120,
    total_submissions: 5000,
    topics: 18,
    languages: 8,
    badges: 10,
  });

  it("caps the list at 8 even when all 11 qualify", () => {
    expect(derivePlaystyles(everything)).toHaveLength(8);
  });

  it("keeps an elite playstyle that the ratio sort alone would have cut", () => {
    // Polyglot at exactly 8 languages is elite, but only 2.0x its base — the
    // weakest ratio among the eight ratio-strong non-plus styles, so ranking by
    // ratio alone would drop it outside the top 8. Plus-first floats it to the top.
    const out = derivePlaystyles(
      signals({
        languages: 8, // elite, ratio 2.0x  ← the one at risk
        hard_solved: 200, // 4.0x
        total_solved: 1500, // 5.0x
        medium_solved: 800, // 4.0x
        contest_attended: 50, // 5.0x
        streak: 120, // 4.0x
        total_submissions: 5000, // 5.0x
        topics: 18, // 2.25x
        badges: 10, // 3.3x
        contest_rating: 2000, // non-plus, low ratio
        acceptance_rate: 80, // non-plus, low ratio
      }),
    );
    expect(out).toHaveLength(8);
    expect(out[0]).toMatchObject({ name: "Polyglot", plus: true });
    expect(out.slice(1).every((p) => !p.plus)).toBe(true);
  });
});

describe("derivePlaystyles — the reason shown on the tooltip", () => {
  it("reads as the real count plus its noun", () => {
    const [p] = derivePlaystyles(signals({ hard_solved: 50 }));
    expect(p.reason).toBe("50 hard solved.");
  });

  it("compacts big counts (15000 → 15k)", () => {
    const [p] = derivePlaystyles(signals({ total_submissions: 15_000 }));
    expect(p.reason).toContain("15k submissions");
  });

  it("calls out the elite tier, and only for plus", () => {
    const [elite] = derivePlaystyles(signals({ hard_solved: 400 }));
    expect(elite.reason).toContain("elite tier");

    const [plain] = derivePlaystyles(signals({ hard_solved: 50 }));
    expect(plain.reason).not.toContain("elite tier");
  });

  it("ships an icon key for the UI to resolve", () => {
    const [p] = derivePlaystyles(signals({ hard_solved: 50 }));
    expect(p.icon).toBe("flame");
  });
});
