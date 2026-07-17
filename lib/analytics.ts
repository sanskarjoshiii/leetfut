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

// File fallback location (project root). Created lazily on first scout.
const FILE = path.join(process.cwd(), ".data", "scouts.json");
type Store = { total: number; seen: string[] };

const normalize = (username: string) => username.trim().replace(/^@/, "").toLowerCase();

// Serialize file writes within this process so two concurrent scouts can't
// read-modify-write over each other (pm2 runs a single instance).
let fileChain: Promise<void> = Promise.resolve();

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const s = JSON.parse(raw) as Partial<Store>;
    return { total: Number(s.total) || 0, seen: Array.isArray(s.seen) ? s.seen : [] };
  } catch {
    return { total: 0, seen: [] };
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
      if (added === 1) await redis.incr(TOTAL_KEY);
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
