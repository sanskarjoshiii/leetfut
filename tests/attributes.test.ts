import { describe, expect, it } from "vitest";
import {
  METRIC_LABELS,
  deriveMetrics,
  deriveSkillMoves,
  deriveStyle,
  deriveWeakFoot,
  deriveWorkRate,
} from "@/lib/scoring/attributes";
import type { Signals, Stats } from "@/lib/scoring/types";

// These attributes are what the scout report shows, and each is a band lookup —
// so the tests pin the BOUNDARIES (an off-by-one silently moves a whole star)
// and the PRECEDENCE (deriveStyle returns the first rule that matches, so rule
// order IS the behaviour).

const base: Signals = {
  login: "octocat",
  name: "The Octocat",
  avatarUrl: "https://assets.leetcode.com/users/octocat/avatar.png",
  country: "United States",
  total_solved: 800,
  easy_solved: 300,
  medium_solved: 400,
  hard_solved: 100,
  acceptance_rate: 55,
  total_submissions: 2000,
  contest_rating: 1600,
  contest_attended: 10,
  contest_global_rank: 5000,
  contest_top_percent: 10,
  ranking: 50_000,
  reputation: 100,
  badges: 3,
  streak: 20,
  active_days: 80,
  active_years: 2,
  recent_solved: 100,
  recent_spike: false,
  topics: 6,
  languages: 3,
  rankedLanguages: ["Python3", "C++"],
  topLanguage: "Python3",
};

const signals = (over: Partial<Signals> = {}): Signals => ({ ...base, ...over });
const stats = (over: Partial<Stats> = {}): Stats => ({ pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60, ...over });

describe("deriveSkillMoves", () => {
  it("bands 1–5 on topic breadth, at the boundaries", () => {
    const at = (topics: number) => deriveSkillMoves(signals({ topics, languages: 1 })).value;
    expect(at(1)).toBe(1);
    expect(at(2)).toBe(2); // first band up
    expect(at(3)).toBe(2);
    expect(at(4)).toBe(3);
    expect(at(7)).toBe(3);
    expect(at(8)).toBe(4);
    expect(at(11)).toBe(4);
    expect(at(12)).toBe(5);
    expect(at(30)).toBe(5); // saturates
  });

  it("adds a star for many languages (6+), but never past 5", () => {
    expect(deriveSkillMoves(signals({ topics: 2, languages: 5 })).value).toBe(2);
    expect(deriveSkillMoves(signals({ topics: 2, languages: 6 })).value).toBe(3); // +1 for languages
    // Already at 5 (topics >= 12): the language bonus can't push past the cap.
    expect(deriveSkillMoves(signals({ topics: 12, languages: 10 })).value).toBe(5);
  });

  it("mentions the language count only when the bonus actually fired", () => {
    expect(deriveSkillMoves(signals({ topics: 2, languages: 6 })).reason).toContain("across 6 languages");
    expect(deriveSkillMoves(signals({ topics: 2, languages: 5 })).reason).not.toContain("languages");
  });

  it("pluralises 'topic' correctly", () => {
    expect(deriveSkillMoves(signals({ topics: 1, languages: 1 })).reason).toContain("1 topic.");
    expect(deriveSkillMoves(signals({ topics: 3, languages: 1 })).reason).toContain("3 topics");
  });
});

describe("deriveWeakFoot", () => {
  // Averages the THREE LOWEST stats, so a one-trick profile rates low however
  // high its spike is.
  const weakSideOf = (lows: [number, number, number]) =>
    deriveWeakFoot(stats({ pac: lows[0], sho: lows[1], pas: lows[2], dri: 99, def: 99, phy: 99 }));

  it("bands 1–5 on the three weakest stats, at the boundaries", () => {
    expect(weakSideOf([72, 72, 72]).value).toBe(5);
    expect(weakSideOf([71, 71, 71]).value).toBe(4);
    expect(weakSideOf([63, 63, 63]).value).toBe(4);
    expect(weakSideOf([62, 62, 62]).value).toBe(3);
    expect(weakSideOf([54, 54, 54]).value).toBe(3);
    expect(weakSideOf([53, 53, 53]).value).toBe(2);
    expect(weakSideOf([45, 45, 45]).value).toBe(2);
    expect(weakSideOf([44, 44, 44]).value).toBe(1);
  });

  it("rates a one-trick profile low despite a 99 spike", () => {
    expect(deriveWeakFoot(stats({ sho: 99, pac: 40, pas: 40, dri: 40, def: 40, phy: 40 })).value).toBe(1);
  });

  it("does not mutate the stats it sorts", () => {
    const s = stats({ pac: 90, sho: 10, pas: 50, dri: 70, def: 30, phy: 60 });
    const before = { ...s };
    deriveWeakFoot(s);
    expect(s).toEqual(before);
  });

  it("reports the weak-side average it used", () => {
    expect(weakSideOf([72, 72, 72]).reason).toContain("average 72/99");
  });
});

describe("deriveWorkRate", () => {
  it("bands attack on the PAC/SHO mean, at the boundaries", () => {
    expect(deriveWorkRate(stats({ pac: 68, sho: 68 })).attack).toBe("High");
    expect(deriveWorkRate(stats({ pac: 67, sho: 67 })).attack).toBe("Med");
    expect(deriveWorkRate(stats({ pac: 50, sho: 50 })).attack).toBe("Med");
    expect(deriveWorkRate(stats({ pac: 49, sho: 49 })).attack).toBe("Low");
  });

  it("rounds the mean half-up (67.5 → 68 → High)", () => {
    expect(deriveWorkRate(stats({ pac: 67, sho: 68 })).attack).toBe("High");
  });

  it("bands defense on ACC (def) alone", () => {
    expect(deriveWorkRate(stats({ def: 68 })).defense).toBe("High");
    expect(deriveWorkRate(stats({ def: 50 })).defense).toBe("Med");
    expect(deriveWorkRate(stats({ def: 49 })).defense).toBe("Low");
  });

  it("reads the two sides independently", () => {
    const w = deriveWorkRate(stats({ pac: 90, sho: 90, def: 10 }));
    expect(w).toMatchObject({ attack: "High", defense: "Low" });
  });
});

describe("deriveStyle", () => {
  it("returns Explosive for a recent spike, above everything else", () => {
    // recent_spike wins even when the profile would also read Relentless.
    const s = signals({ recent_spike: true, active_days: 300, recent_solved: 900 });
    expect(deriveStyle(s).value).toBe("Explosive");
  });

  it("returns Relentless for near-daily, high-volume activity", () => {
    expect(deriveStyle(signals({ active_days: 200, recent_solved: 800 })).value).toBe("Relentless");
    expect(deriveStyle(signals({ active_days: 199, recent_solved: 800 })).value).not.toBe("Relentless");
    expect(deriveStyle(signals({ active_days: 200, recent_solved: 799 })).value).not.toBe("Relentless");
  });

  it("returns Consistent for a long, steady record of practice and contests", () => {
    expect(deriveStyle(signals({ active_years: 4, contest_attended: 20, recent_solved: 100 })).value).toBe(
      "Consistent",
    );
  });

  it("returns Clinical for a deep hard-tier catalogue that's gone quiet", () => {
    const s = signals({ hard_solved: 150, recent_solved: 199, active_years: 1, contest_attended: 0 });
    expect(deriveStyle(s).value).toBe("Clinical");
  });

  // Consistent is checked BEFORE Clinical, so a veteran contestant with a deep
  // hard catalogue reads Consistent. Pinning it: the rule order IS the behaviour.
  it("prefers Consistent over Clinical for a veteran contestant", () => {
    const s = signals({ active_years: 5, contest_attended: 30, hard_solved: 200, recent_solved: 100 });
    expect(deriveStyle(s).value).toBe("Consistent");
  });

  it("returns Industrious for a steadily active year", () => {
    const s = signals({ recent_solved: 300, active_years: 1, contest_attended: 0, hard_solved: 0, active_days: 50 });
    expect(deriveStyle(s).value).toBe("Industrious");
  });

  it("falls back to Measured for a quiet profile", () => {
    const s = signals({ recent_solved: 100, active_years: 1, contest_attended: 0, hard_solved: 0, active_days: 30 });
    expect(deriveStyle(s).value).toBe("Measured");
  });

  it("always ships a reason with the value", () => {
    expect(deriveStyle(signals()).reason).not.toHaveLength(0);
  });
});

describe("deriveMetrics", () => {
  // The nine core metric labels, in display order.
  const CORE_LABELS = [
    METRIC_LABELS.totalSolved,
    METRIC_LABELS.hardSolved,
    METRIC_LABELS.mediumSolved,
    METRIC_LABELS.contestRating,
    METRIC_LABELS.acceptance,
    METRIC_LABELS.streak,
    METRIC_LABELS.topics,
    METRIC_LABELS.submissions,
    METRIC_LABELS.contests,
  ];

  // A profile with every core signal non-zero.
  const full = signals({
    total_solved: 2500,
    hard_solved: 500,
    medium_solved: 1300,
    contest_rating: 2000,
    acceptance_rate: 62,
    streak: 100,
    topics: 26,
    total_submissions: 8000,
    contest_attended: 50,
    easy_solved: 700,
    languages: 4,
    active_days: 300,
    badges: 10,
    reputation: 5000,
  });

  it("shows all nine core metrics when none are zero", () => {
    const m = deriveMetrics(full);
    expect(m).toHaveLength(9);
    expect(m.map((x) => x.label)).toEqual(CORE_LABELS);
  });

  it("hides zeroed core metrics", () => {
    const m = deriveMetrics(signals({ ...full, contest_attended: 0 }));
    expect(m.map((x) => x.label)).not.toContain(METRIC_LABELS.contests);
  });

  // One zeroed metric is absorbed silently; beyond that, each further zero pulls
  // in a real optional metric so a sparse card shows data instead of blanks.
  it("backfills one optional metric per zeroed core beyond the first", () => {
    const oneZero = deriveMetrics(signals({ ...full, contest_attended: 0 }));
    expect(oneZero).toHaveLength(8); // 8 core shown, no filler

    const threeZeros = deriveMetrics(signals({ ...full, contest_attended: 0, contest_rating: 0, topics: 0 }));
    expect(threeZeros).toHaveLength(8); // 6 core + 2 fillers
    expect(threeZeros.map((x) => x.label)).toContain(METRIC_LABELS.easySolved);
    expect(threeZeros.map((x) => x.label)).toContain("Languages");
  });

  it("never shows a zeroed filler either", () => {
    const bare = signals({
      total_solved: 0,
      hard_solved: 0,
      medium_solved: 0,
      contest_rating: 0,
      acceptance_rate: 0,
      streak: 0,
      topics: 0,
      total_submissions: 0,
      contest_attended: 0,
      easy_solved: 0,
      languages: 0,
      active_days: 0,
      badges: 0,
      reputation: 0,
    });
    expect(deriveMetrics(bare)).toEqual([]);
  });

  it("scores 0–99, clamped, with linear bars for rating and acceptance", () => {
    // Problems solved past its elite reference clamps to 99 (log-scaled).
    const solved = deriveMetrics(signals({ ...full, total_solved: 5_000_000 })).find(
      (m) => m.label === METRIC_LABELS.totalSolved,
    )!;
    expect(solved.score).toBe(99);
    expect(solved.value).toBe(5_000_000); // raw count preserved, only score capped

    // Contest rating is a LINEAR bar: 3200 -> 99.
    const rating = deriveMetrics(signals({ ...full, contest_rating: 3200 })).find(
      (m) => m.label === METRIC_LABELS.contestRating,
    )!;
    expect(rating.score).toBe(99);

    // Acceptance is shown as itself on the 0–99 bar.
    const acc = deriveMetrics(signals({ ...full, acceptance_rate: 62 })).find(
      (m) => m.label === METRIC_LABELS.acceptance,
    )!;
    expect(acc.score).toBe(62);
  });

  it("carries the real count and its unit, not just the score", () => {
    const m = deriveMetrics(full).find((x) => x.label === METRIC_LABELS.totalSolved)!;
    expect(m).toMatchObject({ value: 2500, unit: "solved" });
  });
});
