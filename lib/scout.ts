import "server-only";
import { cache } from "react";
import { redis } from "./redis";
import { buildCard } from "./scoring/engine";
import { fetchProfile, type ScoutError } from "./leetcode/client";
import { signalsFromPayload } from "./leetcode/signals";
import { SAMPLE_CARDS } from "./leetcode/samples";
import type { Card } from "./scoring/types";

// Read-through Redis cache for built cards — the single path every scout surface
// (the /<user> page, the JSON API, the OG image) uses to turn a username into a
// Card. A profile is fetched from LeetCode + scored at most once per TTL; repeat
// views, link unfurls and README-embed regenerations are then served from Redis
// instead of each spending a handful of LeetCode GraphQL calls. This is the app's
// highest-leverage perf + rate-limit safeguard.
//
// Best-effort throughout, mirroring lib/analytics + lib/redis: a missing
// REDIS_URL, a cache miss, an outage or a parse error all fall through to a live
// fetch — the cache only ever changes speed, never behaviour.
//
// Two refinements on top of plain read-through:
//  - Stale-while-revalidate: entries stay FRESH for 2h but survive in the store
//    for 24h. A hit inside the stale window is served instantly while one
//    background rebuild (coalesced via `inflight`) refreshes the entry — repeat
//    viewers of a known profile never wait on LeetCode again.
//  - Negative caching: a "notfound" scout is remembered for 5 minutes, so retries
//    of a typo'd / deleted username don't re-spend upstream calls. Only notfound
//    is cached — ratelimit/network/config are transient and always retried.

// Namespaced alongside leetfut:scouts:total. The version segment lets a deploy
// that changes buildCard's output shape or scoring invalidate every entry at
// once (bump it) instead of serving stale-shaped cards until their TTL lapses.
// v2: value went from a bare Card to the { card, freshUntil } / { neg } envelope.
const CACHE_VERSION = "v2";
const FRESH_SECONDS = 60; // 1min — short so a scout reflects fresh solves quickly. Freshness only affects repeat scouts of the SAME profile (a viral burst of DIFFERENT profiles is misses either way, coalesced by `inflight`), so this stays cheap: at most one refetch per profile per minute.
const HARD_TTL_SECONDS = 24 * 60 * 60; // stale-but-servable window; after this a viewer waits on a live fetch again.
const NEG_TTL_SECONDS = 5 * 60; // notfound memory — long enough to absorb retry bursts, short enough to notice a new account.

const normalizeLogin = (username: string) => username.trim().replace(/^@/, "").toLowerCase();
const keyFor = (login: string) => `leetfut:card:${CACHE_VERSION}:${login}`;

// Stored envelope: a built card with its freshness deadline, or a remembered
// notfound. The store-level expiry (Redis EX / mem `exp`) is the hard TTL;
// `freshUntil` marks where fresh ends and stale-while-revalidate begins.
type CacheEntry = { card: Card; freshUntil: number } | { neg: ScoutError };

type ReadResult =
  | { kind: "miss" }
  | { kind: "fresh"; card: Card }
  | { kind: "stale"; card: Card }
  | { kind: "negative"; error: ScoutError };

// In-process fallback cache, used when there's no REDIS_URL. A scout costs a
// handful of upstream calls, so without this every repeat view (the page, its OG
// image, a duel corner, a league row) refetches the same profile. pm2 runs a
// single instance, so this is a real cross-request cache — not a per-request
// no-op. Bounded so a long-lived process can't grow unbounded.
const MEM_MAX = 500;
const mem = new Map<string, { entry: CacheEntry; exp: number }>();

function classify(entry: CacheEntry): ReadResult {
  if ("neg" in entry) return { kind: "negative", error: entry.neg };
  return entry.freshUntil > Date.now()
    ? { kind: "fresh", card: entry.card }
    : { kind: "stale", card: entry.card };
}

async function readCache(login: string): Promise<ReadResult> {
  if (!redis) {
    const hit = mem.get(login);
    if (!hit) return { kind: "miss" };
    if (hit.exp <= Date.now()) {
      mem.delete(login);
      return { kind: "miss" };
    }
    return classify(hit.entry);
  }
  try {
    const raw = await redis.get(keyFor(login));
    return raw ? classify(JSON.parse(raw) as CacheEntry) : { kind: "miss" };
  } catch (e) {
    console.error("[scout] cache read failed:", (e as Error).message);
    return { kind: "miss" };
  }
}

async function writeCache(login: string, entry: CacheEntry, ttlSeconds: number): Promise<void> {
  if (!redis) {
    // Evict the oldest entry once full (Map preserves insertion order).
    if (mem.size >= MEM_MAX) {
      const oldest = mem.keys().next().value;
      if (oldest !== undefined) mem.delete(oldest);
    }
    mem.set(login, { entry, exp: Date.now() + ttlSeconds * 1000 });
    return;
  }
  try {
    await redis.set(keyFor(login), JSON.stringify(entry), "EX", ttlSeconds);
  } catch (e) {
    console.error("[scout] cache write failed:", (e as Error).message);
  }
}

// Single-flight: concurrent scouts of the same login collapse onto one in-flight
// build. The Redis cache takes a beat to populate (a profile fetch is a handful
// of LeetCode calls), so when a profile trends every hit in that fill window would
// otherwise be a full cache miss — one LeetCode fetch *per concurrent viewer*. This
// map coalesces them into a single fetch whose result they all share.
//
// Keyed by normalized login. Entries are deleted the moment the build settles
// (success or failure) so failures are never memoised — the next scout retries —
// and the map can't grow unbounded. Callers never mutate the returned Card (every
// surface spreads it: `{ ...card, country }`), so sharing one object is safe.
const inflight = new Map<string, Promise<Card>>();

async function buildFresh(username: string, login: string): Promise<Card> {
  let payload;
  try {
    payload = await fetchProfile(username);
  } catch (e) {
    // Remember notfound briefly so retries of a bad username stay free; every
    // other failure type is transient and must stay retryable immediately.
    const err = e as ScoutError;
    if (err?.type === "notfound") await writeCache(login, { neg: err }, NEG_TTL_SECONDS);
    throw e;
  }
  const card = buildCard(signalsFromPayload(payload));
  await writeCache(login, { card, freshUntil: Date.now() + FRESH_SECONDS * 1000 }, HARD_TTL_SECONDS);
  return card;
}

// Fire-and-forget rebuild behind a stale hit. Coalesced on the same `inflight`
// map as foreground builds, so a burst of stale views triggers one refresh; the
// error handler keeps a failed background build from becoming an unhandled
// rejection (the viewer already has their stale card).
function revalidateInBackground(username: string, login: string): void {
  if (inflight.has(login)) return;
  const pending = buildFresh(username, login).finally(() => inflight.delete(login));
  // Detached handler: background failures must not become unhandled rejections,
  // but `pending` itself keeps rejecting so a foreground scout that joins this
  // build (via `inflight`) still sees the real error.
  pending.catch((e) => {
    console.error("[scout] background revalidate failed:", (e as ScoutError)?.message ?? e);
  });
  inflight.set(login, pending);
}

// Username -> Card, Redis-cached. Throws the same ScoutError as fetchProfile
// when the scout fails, so callers keep mapping it to a 404 page / error status /
// null OG exactly as before.
export async function scoutCard(username: string): Promise<Card> {
  const login = normalizeLogin(username);

  // Demo mode: with no LEETCODE_API_BASE configured, serve the in-memory sample
  // cards by username so the home-fan samples resolve (and the app stays
  // explorable) without any backend. They live in memory, so they bypass Redis.
  if (!process.env.LEETCODE_API_BASE) {
    const sample = SAMPLE_CARDS.find((c) => c.login.toLowerCase() === login);
    if (sample) return sample;
  }

  const cached = await readCache(login);
  if (cached.kind === "fresh") return cached.card;
  // Remembered notfound: fail exactly like a live notfound, without the fetch.
  if (cached.kind === "negative") throw cached.error;
  // Stale-while-revalidate: serve the old card now, refresh it off the request path.
  if (cached.kind === "stale") {
    revalidateInBackground(username, login);
    return cached.card;
  }

  // Coalesce concurrent misses for this login onto one build (see `inflight`).
  const existing = inflight.get(login);
  if (existing) return existing;

  const pending = buildFresh(username, login).finally(() => inflight.delete(login));
  inflight.set(login, pending);
  return pending;
}

// Request-memoised card load that returns the scout error instead of throwing,
// so a route's generateMetadata + Page — and a Duel's two corners — share one
// scout per request and render the failure state themselves. The cross-request
// Redis cache lives in scoutCard above; this cache() only dedupes within a
// single request/render pass.
export const loadCard = cache(
  async (username: string): Promise<{ card: Card } | { error: ScoutError }> => {
    try {
      return { card: await scoutCard(username) };
    } catch (e) {
      return { error: e as ScoutError };
    }
  },
);
