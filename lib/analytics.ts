import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { redis } from "./redis";

// All-time counter of DISTINCT profiles ever scouted. A profile only ever counts
// once: the first scout of @foo does +1, every later scout of @foo is a no-op.
// Redis is the store when configured (a SET of seen logins gates the INCR); with
// no Redis we fall back to a small JSON file so the counter still works on a
// Docker-free / Redis-less deploy. Best-effort throughout — never throws, never
// blocks the page.
const TOTAL_KEY = "leetfut:scouts:total";
const SEEN_KEY = "leetfut:scouts:seen";

// Per-day counters of NEW distinct profiles, keyed by UTC date, feeding the home
// sparkline. Buckets expire after 90 days (the graph shows 30) so the keyspace
// stays bounded; the all-time total above is the durable number.
const DAILY_PREFIX = "leetfut:scouts:daily:";
const DAILY_TTL_SECONDS = 90 * 24 * 60 * 60;
const dayKeyFor = (day: string) => `${DAILY_PREFIX}${day}`;
const utcDay = (d: Date) => d.toISOString().slice(0, 10);

// Unique VISITORS — one per browser/system, deduped by a persistent client id
// (localStorage), NOT by profile. So a single person opening the site again and
// again, or rating many cards, still counts once. Mirrors the scout keyspace.
const VISITORS_KEY = "leetfut:visitors";
const VISITORS_TOTAL_KEY = "leetfut:visitors:total";
const VISITORS_DAILY_PREFIX = "leetfut:visitors:daily:";
const visitorDayKeyFor = (day: string) => `${VISITORS_DAILY_PREFIX}${day}`;

// File fallback location (project root). Created lazily on first scout.
const FILE = path.join(process.cwd(), ".data", "scouts.json");
type Store = {
  total: number;
  seen: string[];
  daily?: Record<string, number>;
  visitors?: string[];
  visitorsTotal?: number;
  visitorsDaily?: Record<string, number>;
};

const normalize = (username: string) => username.trim().replace(/^@/, "").toLowerCase();

// Serialize file writes within this process so two concurrent scouts can't
// read-modify-write over each other (pm2 runs a single instance).
let fileChain: Promise<void> = Promise.resolve();

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const s = JSON.parse(raw) as Partial<Store>;
    return {
      total: Number(s.total) || 0,
      seen: Array.isArray(s.seen) ? s.seen : [],
      daily: s.daily && typeof s.daily === "object" ? s.daily : {},
      visitors: Array.isArray(s.visitors) ? s.visitors : [],
      visitorsTotal: Number(s.visitorsTotal) || 0,
      visitorsDaily: s.visitorsDaily && typeof s.visitorsDaily === "object" ? s.visitorsDaily : {},
    };
  } catch {
    return { total: 0, seen: [], daily: {}, visitors: [], visitorsTotal: 0, visitorsDaily: {} };
  }
}

// Record a scout of `username`. Increments the distinct-profile total only the
// FIRST time this login is ever seen.
export async function recordScout(username: string): Promise<void> {
  const login = normalize(username);
  if (!login) return;

  if (redis) {
    try {
      // SADD returns 1 only when the member is new -> gate the counter on it.
      const added = await redis.sadd(SEEN_KEY, login);
      if (added === 1) {
        const dayKey = dayKeyFor(utcDay(new Date()));
        await redis
          .multi()
          .incr(TOTAL_KEY)
          .incr(dayKey)
          .expire(dayKey, DAILY_TTL_SECONDS)
          .exec();
      }
    } catch (e) {
      console.error("[analytics] recordScout failed:", (e as Error).message);
    }
    return;
  }

  // File fallback (no Redis).
  fileChain = fileChain.then(async () => {
    try {
      const store = await readStore();
      if (store.seen.includes(login)) return;
      store.seen.push(login);
      store.total += 1;
      const today = utcDay(new Date());
      const daily = store.daily ?? {};
      daily[today] = (daily[today] || 0) + 1;
      // Same 90-day retention as the Redis buckets, enforced on write.
      const cutoff = utcDay(new Date(Date.now() - DAILY_TTL_SECONDS * 1000));
      for (const day of Object.keys(daily)) if (day < cutoff) delete daily[day];
      store.daily = daily;
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(store));
    } catch (e) {
      console.error("[analytics] recordScout (file) failed:", (e as Error).message);
    }
  });
  return fileChain;
}

// Current distinct-scout count for the home counter. Null when unavailable or
// still zero, so the UI hides the tally rather than showing a fake/empty 0.
export async function getScoutCount(): Promise<number | null> {
  if (redis) {
    try {
      const v = await redis.get(TOTAL_KEY);
      return v != null ? Number(v) : null;
    } catch {
      return null;
    }
  }
  try {
    const { total } = await readStore();
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

// One point per day for the home sparkline: the cumulative distinct-scout total
// at the end of each of the last `days` UTC days, ending today. Reconstructed
// backwards from the live total minus each day's new-scout bucket, so days from
// before daily tracking existed flatten to the earliest known value instead of
// dropping to zero. Null when the counter itself is unavailable.
export type ScoutHistoryPoint = { day: string; total: number };

export async function getScoutHistory(days = 30): Promise<ScoutHistoryPoint[] | null> {
  const total = await getScoutCount();
  if (total == null) return null;

  const dayList: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayList.push(utcDay(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }

  let dailyNew: Record<string, number> = {};
  if (redis) {
    try {
      const values = await redis.mget(dayList.map(dayKeyFor));
      dayList.forEach((day, i) => {
        dailyNew[day] = Number(values[i]) || 0;
      });
    } catch {
      return null;
    }
  } else {
    try {
      dailyNew = (await readStore()).daily ?? {};
    } catch {
      return null;
    }
  }

  // Walk backwards: today's end-of-day total is the live total; each earlier
  // day's is that minus the newer day's new scouts. Clamp at 0 for safety.
  const points: ScoutHistoryPoint[] = new Array(dayList.length);
  let running = total;
  for (let i = dayList.length - 1; i >= 0; i--) {
    points[i] = { day: dayList[i], total: Math.max(0, running) };
    running -= dailyNew[dayList[i]] || 0;
  }
  return points;
}

// ---- unique visitors (per-browser id, deduped once) ----

// Record a visit from `vid` (a persistent per-browser id). Counts each id ONCE:
// the first visit does +1, every later visit (repeat opens, more cards) is a
// no-op. Best-effort, mirroring recordScout.
export async function recordVisitor(vid: string): Promise<void> {
  const id = (vid || "").trim().slice(0, 64);
  if (!id) return;

  if (redis) {
    try {
      const added = await redis.sadd(VISITORS_KEY, id);
      if (added === 1) {
        const dayKey = visitorDayKeyFor(utcDay(new Date()));
        await redis
          .multi()
          .incr(VISITORS_TOTAL_KEY)
          .incr(dayKey)
          .expire(dayKey, DAILY_TTL_SECONDS)
          .exec();
      }
    } catch (e) {
      console.error("[analytics] recordVisitor failed:", (e as Error).message);
    }
    return;
  }

  fileChain = fileChain.then(async () => {
    try {
      const store = await readStore();
      const visitors = store.visitors ?? [];
      if (visitors.includes(id)) return;
      visitors.push(id);
      const today = utcDay(new Date());
      const vdaily = store.visitorsDaily ?? {};
      vdaily[today] = (vdaily[today] || 0) + 1;
      const cutoff = utcDay(new Date(Date.now() - DAILY_TTL_SECONDS * 1000));
      for (const day of Object.keys(vdaily)) if (day < cutoff) delete vdaily[day];
      store.visitors = visitors;
      store.visitorsTotal = (store.visitorsTotal || 0) + 1;
      store.visitorsDaily = vdaily;
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(store));
    } catch (e) {
      console.error("[analytics] recordVisitor (file) failed:", (e as Error).message);
    }
  });
  return fileChain;
}

export async function getVisitorCount(): Promise<number | null> {
  if (redis) {
    try {
      const v = await redis.get(VISITORS_TOTAL_KEY);
      return v != null ? Number(v) : null;
    } catch {
      return null;
    }
  }
  try {
    const total = (await readStore()).visitorsTotal ?? 0;
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

// Per-day cumulative unique-visitor totals for the home sparkline (same shape as
// getScoutHistory, but for visitors).
export async function getVisitorHistory(days = 30): Promise<ScoutHistoryPoint[] | null> {
  const total = await getVisitorCount();
  if (total == null) return null;

  const dayList: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayList.push(utcDay(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }

  let dailyNew: Record<string, number> = {};
  if (redis) {
    try {
      const values = await redis.mget(dayList.map(visitorDayKeyFor));
      dayList.forEach((day, i) => {
        dailyNew[day] = Number(values[i]) || 0;
      });
    } catch {
      return null;
    }
  } else {
    try {
      dailyNew = (await readStore()).visitorsDaily ?? {};
    } catch {
      return null;
    }
  }

  const points: ScoutHistoryPoint[] = new Array(dayList.length);
  let running = total;
  for (let i = dayList.length - 1; i >= 0; i--) {
    points[i] = { day: dayList[i], total: Math.max(0, running) };
    running -= dailyNew[dayList[i]] || 0;
  }
  return points;
}
