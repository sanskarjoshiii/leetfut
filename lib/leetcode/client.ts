import "server-only";

// Server-only LeetCode client. LeetCode has no official public API, so we read
// through alfa-leetcode-api (https://github.com/alfaarghya/alfa-leetcode-api),
// which wraps LeetCode's GraphQL. Point LEETCODE_API_BASE at your own instance
// (recommended — the public demo cold-starts and is rate-limited):
//
//   docker run -p 3000:3000 alfaarghya/alfa-leetcode-api:2.0.4
//   LEETCODE_API_BASE=http://localhost:3000
//
// A scout reads a handful of endpoints in parallel (profile, solved, contest,
// languages, skills, calendar, badges) and flattens them into one RawPayload.
// Every endpoint is best-effort except the base profile: a missing sub-endpoint
// degrades a field to 0/empty rather than failing the whole scout.

export type ScoutErrorType = "invalid" | "notfound" | "ratelimit" | "network" | "config";

export interface ScoutError {
  type: ScoutErrorType;
  message: string;
}

// Flat, normalized profile — all fields below are real LeetCode data.
export interface RawPayload {
  username: string;
  name: string | null;
  avatar: string;
  country: string | null;
  ranking: number;
  reputation: number;
  badges: number;

  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  acceptanceRate: number; // 0–100

  contestRating: number;
  contestAttended: number;
  contestGlobalRanking: number;
  contestTopPercentage: number;

  // { languageName -> problemsSolved } and { tagName -> problemsSolved }.
  languages: { language: string; solved: number }[];
  topics: number;

  // Recent submission calendar: { unixDaySeconds(string) -> submissionCount }.
  submissionCalendar: Record<string, number>;
}

// LeetCode usernames: letters, digits, underscore, dot, hyphen; 1–25 chars.
// Kept a touch looser than LeetCode's signup grammar; LeetCode is the arbiter of
// existence — this only screens out impossible input (spaces, symbols, length).
const VALID = /^[a-zA-Z0-9_.-]{1,25}$/;
// Abort a hung request instead of letting it stall the whole scout. Kept below
// Vercel's ~10s serverless cap so we still return a clean error/partial.
const REQUEST_TIMEOUT_MS = 9_000;
const DAY = 86_400; // seconds

const base = () => (process.env.LEETCODE_API_BASE || "https://alfa-leetcode-api.onrender.com").replace(/\/+$/, "");

const fail = (type: ScoutErrorType, message: string): never => {
  throw { type, message } satisfies ScoutError;
};

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};

interface Fetched {
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

// GET one endpoint, JSON-parsed. Never throws for HTTP errors — returns ok:false
// so callers decide whether a given endpoint is fatal (only the base profile is).
// A thrown network/timeout on the FIRST (base) call is surfaced by fetchProfile.
// Try several endpoint spellings in order, returning the first that responds ok.
// (The alfa API has renamed some routes across versions, e.g. language stats.)
async function getJsonAny(paths: string[]): Promise<Fetched> {
  let last: Fetched = { ok: false, status: 0, data: null };
  for (const p of paths) {
    last = await getJson(p);
    if (last.ok) return last;
  }
  return last;
}

async function getJson(path: string): Promise<Fetched> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${base()}${path}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// The alfa API signals a missing user with an `errors` field (string or array)
// and/or a non-2xx status; a real profile always carries a username (flat or
// nested under matchedUser, depending on the API version).
const looksNotFound = (f: Fetched): boolean =>
  !f.ok || !f.data || Boolean(f.data.errors) || (!f.data.username && !f.data.matchedUser?.username);

// Longest run of consecutive active days in the submission calendar.
function longestStreak(cal: Record<string, number>): number {
  const days = Object.entries(cal)
    .filter(([, c]) => num(c) > 0)
    .map(([ts]) => Math.floor(num(ts) / DAY))
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = NaN;
  for (const d of days) {
    run = d === prev + 1 ? run + 1 : 1;
    prev = d;
    if (run > best) best = run;
  }
  return best;
}

function activeYears(cal: Record<string, number>): number {
  const years = new Set<number>();
  for (const [ts, c] of Object.entries(cal)) {
    if (num(c) > 0) years.add(new Date(num(ts) * 1000).getUTCFullYear());
  }
  return Math.max(1, years.size);
}

// LeetCode's submissionCalendar can arrive as a JSON string or an object.
function parseCalendar(raw: unknown): Record<string, number> {
  if (!raw) return {};
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof obj !== "object" || obj === null) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) out[k] = num(v);
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLanguages(data: any): { language: string; solved: number }[] {
  const arr =
    data?.matchedUser?.languageProblemCount ??
    data?.languageProblemCount ??
    (Array.isArray(data) ? data : data?.languages) ??
    [];
  if (!Array.isArray(arr)) return [];
  return arr
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => ({ language: String(l.languageName ?? l.language ?? l.name ?? ""), solved: num(l.problemsSolved ?? l.solved ?? l.count) }))
    .filter((l) => l.language);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTopics(data: any): number {
  const groups = data?.matchedUser?.tagProblemCounts ?? data?.tagProblemCounts ?? data?.data ?? data;
  const names = new Set<string>();
  for (const key of ["advanced", "intermediate", "fundamental"]) {
    const list = groups?.[key];
    if (Array.isArray(list)) {
      for (const t of list) if (num(t.problemsSolved ?? t.count) > 0 && (t.tagName ?? t.name)) names.add(String(t.tagName ?? t.name));
    }
  }
  return names.size;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function acceptance(solved: any): number {
  // acSubmissionNum / totalSubmissionNum "All" buckets → acceptance %.
  const all = (list: unknown): { count: number; submissions: number } => {
    if (!Array.isArray(list)) return { count: 0, submissions: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = list.find((x: any) => (x.difficulty ?? "All") === "All") ?? list[0] ?? {};
    return { count: num(row.count), submissions: num(row.submissions) };
  };
  const ac = all(solved?.acSubmissionNum);
  const total = all(solved?.totalSubmissionNum);
  if (total.submissions > 0) return Math.round((ac.submissions / total.submissions) * 100);
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function totalSubmissions(solved: any): number {
  const list = solved?.totalSubmissionNum;
  if (!Array.isArray(list)) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = list.find((x: any) => (x.difficulty ?? "All") === "All");
  if (row) return num(row.submissions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.reduce((s: number, x: any) => s + num(x.submissions), 0);
}

export async function fetchProfile(username: string): Promise<RawPayload> {
  const user = username.trim().replace(/^@/, "");
  if (!VALID.test(user)) return fail("invalid", "That doesn't look like a LeetCode username.");

  // Base profile decides existence; the rest are best-effort. All fired together.
  const [profile, solved, contest, language, skill, calendar, badges] = await Promise.all([
    getJson(`/${user}`),
    getJson(`/${user}/solved`),
    getJson(`/${user}/contest`),
    getJsonAny([`/${user}/languageStats`, `/${user}/language`]),
    getJson(`/${user}/skill`),
    getJson(`/${user}/calendar`),
    getJson(`/${user}/badges`),
  ]);

  if (profile.status === 429) return fail("ratelimit", "LeetCode API rate limit hit. Try again shortly.");
  // A hard network failure on the base call (status 0 = fetch threw/timed out).
  if (profile.status === 0 && !profile.data) return fail("network", "Couldn't reach the LeetCode API.");
  if (looksNotFound(profile)) return fail("notfound", "No LeetCode user by that name.");

  // Support both flat profiles and matchedUser-nested ones (API-version drift).
  const p = profile.data;
  const mu = p.matchedUser ?? {};
  const prof = mu.profile ?? {};
  const s = solved.ok ? solved.data : {};
  const c = contest.ok ? contest.data : {};
  const cal = parseCalendar(
    calendar.data?.submissionCalendar ?? p?.submissionCalendar ?? calendar.data,
  );

  const languages = parseLanguages(language.ok ? language.data : {});
  const topics = parseTopics(skill.ok ? skill.data : {});
  const badgeList = badges.data?.badges ?? badges.data?.badgesList;
  const badgeCount = Array.isArray(badgeList) ? badgeList.length : num(badges.data?.badgesCount ?? p?.badges);

  const easySolved = num(s.easySolved);
  const mediumSolved = num(s.mediumSolved);
  const hardSolved = num(s.hardSolved);
  const totalSolved = num(s.solvedProblem ?? s.totalSolved) || easySolved + mediumSolved + hardSolved;

  return {
    username: String(p.username ?? mu.username ?? user),
    name: p.name ?? p.realName ?? prof.realName ?? null,
    avatar: String(p.avatar ?? p.userAvatar ?? prof.userAvatar ?? ""),
    country: p.country ?? p.countryName ?? prof.countryName ?? null,
    ranking: num(p.ranking ?? prof.ranking),
    reputation: num(p.reputation ?? prof.reputation),
    badges: badgeCount,

    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    totalSubmissions: totalSubmissions(s),
    acceptanceRate: acceptance(s),

    contestRating: Math.round(num(c.contestRating)),
    contestAttended: num(c.contestAttend ?? c.contestAttended),
    contestGlobalRanking: num(c.contestGlobalRanking),
    contestTopPercentage: num(c.contestTopPercentage),

    languages,
    topics,
    submissionCalendar: cal,
  };
}

// Exposed for signals.ts (kept here so the calendar math lives beside the fetch).
export const calendarStats = (cal: Record<string, number>) => ({
  activeDays: Object.values(cal).filter((c) => c > 0).length,
  streak: longestStreak(cal),
  activeYears: activeYears(cal),
  recentSolved: Object.values(cal).reduce((sum, c) => sum + c, 0),
});
