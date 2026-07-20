import "server-only";
import Redis from "ioredis";

// One shared connection, stashed on globalThis so dev HMR doesn't leak sockets.
declare global {
  var __leetfutRedis: Redis | null | undefined;
}

function create(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const client = new Redis(url, {
    // The VPS Redis presents a self-signed cert — keep TLS encryption but skip
    // chain verification (the traffic is still encrypted end to end).
    tls: url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    // Commands fail fast (never hang a page) and the caller degrades gracefully.
    maxRetriesPerRequest: 2,
    commandTimeout: 3000,
    connectTimeout: 10000,
    keepAlive: 15000,
    // The Redis host is a dynamic-DNS name (duckdns) on a rotating IP. When that
    // IP changes the live connection dies; keep reconnecting forever with capped
    // backoff so it recovers — each reconnect does a fresh DNS lookup and picks
    // up the new IP, instead of the socket staying dead and silently dropping
    // every counter write. Without this a single IP rotation stops all stats.
    retryStrategy: (times) => Math.min(1000 + times * 1000, 20000),
    reconnectOnError: () => true,
    enableReadyCheck: true,
  });
  // Log only distinct errors so a flapping host doesn't spam the log.
  let lastErr = "";
  client.on("error", (e) => {
    if (e.message !== lastErr) {
      lastErr = e.message;
      console.error("[redis]", e.message);
    }
  });
  client.on("ready", () => {
    lastErr = "";
    console.log("[redis] connected");
  });
  return client;
}

export const redis: Redis | null =
  globalThis.__leetfutRedis !== undefined ? globalThis.__leetfutRedis : (globalThis.__leetfutRedis = create());
