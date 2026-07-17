import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Exercises the real fetchProfile against a scripted global.fetch: it fires seven
// parallel GETs (profile, solved, contest, languageStats, skill, calendar,
// badges) and flattens them into one RawPayload. The base profile decides
// existence; the rest are best-effort. No network — every response is scripted.
vi.mock("server-only", () => ({}));

import { calendarStats, fetchProfile } from "@/lib/leetcode/client";

const DAY = 86_400;
const BASE_URL = "http://test-api";
const USER = "lee215";

// A per-path response table. Each entry becomes a minimal Response-like object.
type Resp = { ok?: boolean; status?: number; body: unknown };
let routes: Record<string, Resp>;
let calls: string[];

function scriptFetch() {
  const mock = vi.fn(async (url: unknown) => {
    const path = String(url).replace(BASE_URL, "");
    calls.push(path);
    const r = routes[path];
    if (!r) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body };
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

// A full, healthy profile across all seven endpoints.
const healthyRoutes = (): Record<string, Resp> => ({
  [`/${USER}`]: {
    body: { username: USER, name: "Lee", avatar: "a.png", country: "United States", ranking: 90, reputation: 120 },
  },
  [`/${USER}/solved`]: {
    body: {
      solvedProblem: 2500,
      easySolved: 700,
      mediumSolved: 1300,
      hardSolved: 500,
      acSubmissionNum: [{ difficulty: "All", count: 2500, submissions: 4000 }],
      totalSubmissionNum: [{ difficulty: "All", count: 2500, submissions: 8000 }],
    },
  },
  [`/${USER}/contest`]: {
    body: { contestRating: 3020.6, contestAttend: 210, contestGlobalRanking: 45, contestTopPercentage: 0.1 },
  },
  [`/${USER}/languageStats`]: {
    body: {
      matchedUser: {
        languageProblemCount: [
          { languageName: "C++", problemsSolved: 1500 },
          { languageName: "Python3", problemsSolved: 1000 },
        ],
      },
    },
  },
  [`/${USER}/skill`]: {
    body: {
      matchedUser: {
        tagProblemCounts: {
          advanced: [{ tagName: "DP", problemsSolved: 100 }],
          intermediate: [{ tagName: "Graph", problemsSolved: 50 }],
          fundamental: [{ tagName: "Array", problemsSolved: 200 }],
        },
      },
    },
  },
  [`/${USER}/calendar`]: {
    body: { submissionCalendar: JSON.stringify({ [String(1_704_067_200)]: 3, [String(1_704_067_200 + DAY)]: 2 }) },
  },
  [`/${USER}/badges`]: { body: { badges: [{}, {}, {}] } },
});

beforeEach(() => {
  calls = [];
  routes = healthyRoutes();
  vi.stubEnv("LEETCODE_API_BASE", BASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchProfile — flattening", () => {
  it("fires all seven endpoints and flattens them into one payload", async () => {
    scriptFetch();
    const p = await fetchProfile(USER);

    expect(calls.sort()).toEqual(
      [`/${USER}`, `/${USER}/badges`, `/${USER}/calendar`, `/${USER}/contest`, `/${USER}/languageStats`, `/${USER}/skill`, `/${USER}/solved`].sort(),
    );

    expect(p).toMatchObject({
      username: USER,
      name: "Lee",
      avatar: "a.png",
      country: "United States",
      ranking: 90,
      reputation: 120,
      totalSolved: 2500,
      easySolved: 700,
      mediumSolved: 1300,
      hardSolved: 500,
      totalSubmissions: 8000,
      acceptanceRate: 50, // 4000 accepted / 8000 total
      contestRating: 3021, // rounded
      contestAttended: 210,
      contestGlobalRanking: 45,
      contestTopPercentage: 0.1,
      topics: 3, // one tag from each skill group
      badges: 3,
    });
    expect(p.languages).toEqual([
      { language: "C++", solved: 1500 },
      { language: "Python3", solved: 1000 },
    ]);
    expect(p.submissionCalendar).toEqual({ "1704067200": 3, "1704153600": 2 });
  });

  it("degrades best-effort sub-endpoints to 0/empty without failing the scout", async () => {
    routes[`/${USER}/solved`] = { ok: false, status: 500, body: {} };
    routes[`/${USER}/contest`] = { ok: false, status: 500, body: {} };
    routes[`/${USER}/languageStats`] = { ok: false, status: 500, body: {} };
    routes[`/${USER}/skill`] = { ok: false, status: 500, body: {} };
    routes[`/${USER}/badges`] = { ok: false, status: 500, body: {} };
    scriptFetch();
    const p = await fetchProfile(USER);
    expect(p.username).toBe(USER); // base still succeeded
    expect(p.totalSolved).toBe(0);
    expect(p.contestRating).toBe(0);
    expect(p.languages).toEqual([]);
    expect(p.topics).toBe(0);
  });
});

describe("fetchProfile — error classification", () => {
  it("throws notfound when the base profile is not ok", async () => {
    routes[`/${USER}`] = { ok: false, status: 404, body: {} };
    scriptFetch();
    await expect(fetchProfile(USER)).rejects.toMatchObject({ type: "notfound" });
  });

  it("throws notfound when the base body carries a GraphQL errors field", async () => {
    routes[`/${USER}`] = { ok: true, status: 200, body: { errors: "User matching query does not exist." } };
    scriptFetch();
    await expect(fetchProfile(USER)).rejects.toMatchObject({ type: "notfound" });
  });

  it("throws ratelimit on a 429 base response", async () => {
    routes[`/${USER}`] = { ok: false, status: 429, body: {} };
    scriptFetch();
    await expect(fetchProfile(USER)).rejects.toMatchObject({ type: "ratelimit" });
  });

  it("throws network when the base call itself fails to reach the API", async () => {
    // fetch rejects entirely -> getJson catches -> {ok:false,status:0,data:null}.
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));
    await expect(fetchProfile(USER)).rejects.toMatchObject({ type: "network" });
  });

  it("rejects impossible usernames before any network call", async () => {
    const mock = scriptFetch();
    for (const bad of ["foo bar", "foo@bar", "", "-".repeat(0), "a".repeat(30)]) {
      await expect(fetchProfile(bad)).rejects.toMatchObject({ type: "invalid" });
    }
    expect(mock).not.toHaveBeenCalled();
  });
});

describe("calendarStats", () => {
  it("counts the longest run of consecutive unix-day timestamps (86400 apart)", () => {
    const at = (offset: number) => String(1_704_067_200 + offset * DAY);
    // days 0,1,2 consecutive (run 3), gap, 5,6 (run 2) -> best 3.
    const cal = { [at(0)]: 1, [at(1)]: 2, [at(2)]: 1, [at(5)]: 4, [at(6)]: 1 };
    const s = calendarStats(cal);
    expect(s.streak).toBe(3);
    expect(s.activeDays).toBe(5);
    expect(s.recentSolved).toBe(9);
  });

  it("breaks the run on a zero-count day and floors active years at 1", () => {
    const at = (offset: number) => String(1_704_067_200 + offset * DAY);
    const s = calendarStats({ [at(0)]: 3, [at(1)]: 0, [at(2)]: 2 });
    expect(s.streak).toBe(1);
    expect(s.activeDays).toBe(2);
    expect(calendarStats({}).activeYears).toBe(1);
  });
});
