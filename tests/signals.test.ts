import { describe, expect, it, vi } from "vitest";

// signals.ts -> client.ts pulls in `server-only`; stub it so the module imports
// under the Node/vitest test environment.
vi.mock("server-only", () => ({}));

import { signalsFromPayload } from "@/lib/leetcode/signals";
import { calendarStats, type RawPayload } from "@/lib/leetcode/client";

// signalsFromPayload maps a flat, already-real LeetCode payload onto the scoring
// Signals. We pin the three things it actually derives: the calendar math
// (streak / active days / years / recent), the language ranking (headline
// languages float above styling/markup), and straight field passthrough.

const DAY = 86_400;
// 2024-01-01T00:00:00Z, aligned to a day boundary so ts/DAY is a clean integer.
const BASE = 1_704_067_200;
const dayTs = (offset: number) => String(BASE + offset * DAY);

const payload = (over: Partial<RawPayload> = {}): RawPayload => ({
  username: "someuser",
  name: null,
  avatar: "",
  country: null,
  ranking: 0,
  reputation: 0,
  badges: 0,
  totalSolved: 0,
  easySolved: 0,
  mediumSolved: 0,
  hardSolved: 0,
  totalSubmissions: 0,
  acceptanceRate: 0,
  contestRating: 0,
  contestAttended: 0,
  contestGlobalRanking: 0,
  contestTopPercentage: 0,
  languages: [],
  topics: 0,
  submissionCalendar: {},
  ...over,
});

describe("calendarStats", () => {
  it("counts the longest run of consecutive active days", () => {
    // 0,1,2 consecutive (run of 3), gap, 5,6 consecutive (run of 2) -> best 3.
    const cal = { [dayTs(0)]: 2, [dayTs(1)]: 1, [dayTs(2)]: 4, [dayTs(5)]: 1, [dayTs(6)]: 3 };
    const s = calendarStats(cal);
    expect(s.streak).toBe(3);
    expect(s.activeDays).toBe(5); // 5 distinct days with submissions
    expect(s.recentSolved).toBe(11); // sum of all counts
  });

  it("ignores zero-count days for the streak and active-day tally", () => {
    const cal = { [dayTs(0)]: 3, [dayTs(1)]: 0, [dayTs(2)]: 2 };
    const s = calendarStats(cal);
    expect(s.streak).toBe(1); // the zero breaks the run
    expect(s.activeDays).toBe(2);
    expect(s.recentSolved).toBe(5);
  });

  it("counts distinct calendar years (min 1)", () => {
    // one day in 2023, one in 2024.
    const s = calendarStats({ [String(BASE - 40 * DAY)]: 1, [dayTs(0)]: 1 });
    expect(s.activeYears).toBe(2);
    expect(calendarStats({}).activeYears).toBe(1);
  });
});

describe("signalsFromPayload — calendar-derived activity", () => {
  it("threads the calendar stats onto the signals", () => {
    const cal = { [dayTs(0)]: 5, [dayTs(1)]: 5, [dayTs(2)]: 5, [dayTs(9)]: 5 };
    const s = signalsFromPayload(payload({ submissionCalendar: cal }));
    expect(s.streak).toBe(3);
    expect(s.active_days).toBe(4);
    expect(s.active_years).toBe(1);
    expect(s.recent_solved).toBe(20);
  });

  it("flags a recent spike when this year clearly outpaces the per-year average", () => {
    const cal = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [dayTs(i), 50])); // 500 recent
    // avgPerYear = totalSubmissions / activeYears = 500 / 1 = 500; 500 !> 1.8*500.
    expect(signalsFromPayload(payload({ submissionCalendar: cal, totalSubmissions: 500 })).recent_spike).toBe(false);
    // With a small lifetime total, 500 recent easily clears 1.8x the average.
    expect(signalsFromPayload(payload({ submissionCalendar: cal, totalSubmissions: 200 })).recent_spike).toBe(true);
  });
});

describe("signalsFromPayload — language ranking", () => {
  it("ranks by problems solved (desc), floating headline languages above styling/markup", () => {
    const s = signalsFromPayload(
      payload({
        languages: [
          { language: "CSS", solved: 500 }, // most solved, but styling -> demoted
          { language: "Python3", solved: 200 },
          { language: "C++", solved: 300 },
          { language: "HTML", solved: 10 },
        ],
      }),
    );
    // C++ (300) then Python3 (200) are real languages; CSS/HTML demoted after.
    expect(s.rankedLanguages).toEqual(["C++", "Python3", "CSS", "HTML"]);
    expect(s.topLanguage).toBe("C++");
    expect(s.languages).toBe(4); // count of languages with solved > 0
  });

  it("excludes zero-solved languages from the count", () => {
    const s = signalsFromPayload(
      payload({ languages: [{ language: "Go", solved: 5 }, { language: "Rust", solved: 0 }] }),
    );
    expect(s.languages).toBe(1);
    expect(s.topLanguage).toBe("Go");
  });

  it("reports no top language for an empty language list", () => {
    const s = signalsFromPayload(payload({ languages: [] }));
    expect(s.languages).toBe(0);
    expect(s.rankedLanguages).toEqual([]);
    expect(s.topLanguage).toBeNull();
  });
});

describe("signalsFromPayload — field passthrough", () => {
  it("maps the flat payload fields straight onto the signals", () => {
    const s = signalsFromPayload(
      payload({
        username: "lee215",
        name: "Lee",
        avatar: "https://x/a.png",
        country: "United States",
        ranking: 90,
        reputation: 12_000,
        badges: 15,
        totalSolved: 2500,
        easySolved: 700,
        mediumSolved: 1300,
        hardSolved: 500,
        totalSubmissions: 8000,
        acceptanceRate: 62,
        contestRating: 3020,
        contestAttended: 210,
        contestGlobalRanking: 45,
        contestTopPercentage: 0.1,
        topics: 26,
      }),
    );
    expect(s).toMatchObject({
      login: "lee215",
      name: "Lee",
      avatarUrl: "https://x/a.png",
      country: "United States",
      ranking: 90,
      reputation: 12_000,
      badges: 15,
      total_solved: 2500,
      easy_solved: 700,
      medium_solved: 1300,
      hard_solved: 500,
      total_submissions: 8000,
      acceptance_rate: 62,
      contest_rating: 3020,
      contest_attended: 210,
      contest_global_rank: 45,
      contest_top_percent: 0.1,
      topics: 26,
    });
  });

  it("falls back to the username for a missing name and floors contest top-percent for non-contestants", () => {
    const noContest = signalsFromPayload(payload({ username: "ghost", contestRating: 0, contestTopPercentage: 0 }));
    expect(noContest.name).toBe("ghost"); // name || username
    expect(noContest.contest_top_percent).toBe(100); // no contest -> worst percentile
  });
});
