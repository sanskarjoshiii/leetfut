"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Card } from "@/lib/scoring/types";
import Background from "./Background";
import FooterCredit from "./FooterCredit";
import InspiredBy from "./InspiredBy";

// The League standings — you + your crew, each scouted live, sorted into a table
// with a 1st/2nd/3rd podium. Cards are fetched client-side from the same card API
// the scout uses, so a league is just N scouts ranked by overall.

const MEDAL = ["🥇", "🥈", "🥉"];
const TIER_INK: Record<string, string> = {
  bronze: "#F0CFA8",
  silver: "#D6DCE6",
  gold: "#F3D679",
  totw: "#FFD3D9",
  toty: "#CADBFF",
  icon: "#F3D688",
  founder: "#ff6273",
};
const inkFor = (f: string) => TIER_INK[f] ?? "#f5f5f4";

const AVATAR_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="%23151412"/><circle cx="60" cy="46" r="24" fill="%23ffffff" fill-opacity="0.2"/><rect x="20" y="78" width="80" height="60" rx="30" fill="%23ffffff" fill-opacity="0.2"/></svg>',
  );
const onAvatarError: React.ReactEventHandler<HTMLImageElement> = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = AVATAR_FALLBACK;
};

export default function LeagueView({ players }: { players: string[] }) {
  const logins = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of players) {
      const u = p.trim().replace(/^@/, "");
      if (u && !seen.has(u.toLowerCase())) {
        seen.add(u.toLowerCase());
        out.push(u);
      }
    }
    return out.slice(0, 6);
  }, [players]);

  const [cards, setCards] = useState<Card[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    // All setState lives inside the async runner (never synchronously in the
    // effect body) so a fetch cycle can't cascade renders on mount.
    const run = async () => {
      if (!logins.length) {
        if (alive) setCards([]);
        return;
      }
      if (alive) {
        setCards(null);
        setFailed([]);
      }
      const res = await Promise.all(
        logins.map(async (u) => {
          try {
            const r = await fetch(`/api/card/${encodeURIComponent(u)}`);
            if (!r.ok) return { u, card: null };
            return { u, card: (await r.json()) as Card };
          } catch {
            return { u, card: null };
          }
        }),
      );
      if (!alive) return;
      const ok = res.filter((r) => r.card).map((r) => r.card as Card);
      ok.sort(
        (a, b) =>
          b.overall - a.overall ||
          b.baseOVR - a.baseOVR ||
          (b.legacy?.L ?? 0) - (a.legacy?.L ?? 0),
      );
      setCards(ok);
      setFailed(res.filter((r) => !r.card).map((r) => r.u));
    };
    void run();
    return () => {
      alive = false;
    };
  }, [logins]);

  const podium = cards ? cards.slice(0, 3) : [];
  // podium display order: 2nd, 1st, 3rd (so the winner stands centre + tallest)
  const podiumOrder = podium.length === 3 ? [1, 0, 2] : podium.map((_, i) => i);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-ink">
      <Background />
      <main className="relative z-[2] mx-auto flex min-h-screen w-full max-w-[880px] flex-col px-[clamp(16px,4vw,24px)] py-[clamp(18px,3vh,28px)]">
        {/* top bar */}
        <div className="mb-[clamp(18px,4vh,34px)] flex items-center justify-between gap-[10px]">
          <Link
            href="/"
            className="group inline-flex items-center gap-[6px] text-[13px] font-medium tracking-wide text-ink-faint transition hover:text-ink"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            LEETFUT
          </Link>
          <img src="/leetfutlogo.png" alt="LeetFut" draggable={false} className="h-[34px] w-auto select-none rounded-[8px]" />
        </div>

        {/* title */}
        <div className="text-center">
          <div className="font-mono mb-[10px] text-[11px] font-semibold tracking-[.3em] text-brand">
            LEETCODE × WORLD CUP 26
          </div>
          <h1 className="font-fantasy m-0 text-[clamp(34px,7vw,64px)] font-bold leading-[1] tracking-[.015em]">
            THE LEAGUE<span className="text-brand">.</span>
          </h1>
          <p className="mx-auto mt-[12px] max-w-[440px] text-[14px] leading-[1.5] text-ink-faint">
            Your crew, scouted live and ranked by overall. Winner takes the top of the table.
          </p>
        </div>

        {cards === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-[14px] py-[60px] text-ink-faint">
            <span className="h-[26px] w-[26px] animate-spin rounded-full border-[2px] border-brand/25 border-t-brand" />
            <span className="font-mono text-[13px] tracking-[.06em]">Building the table…</span>
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-[10px] py-[60px] text-center">
            <p className="text-[15px] text-ink-dim">No players could be scouted.</p>
            <Link href="/" className="font-display text-[15px] tracking-[.06em] text-brand hover:text-brand-hi">
              ← BACK TO SCOUT
            </Link>
          </div>
        ) : (
          <>
            {/* podium */}
            {podium.length >= 2 && (
              <div className="mt-[clamp(26px,5vh,46px)] flex items-end justify-center gap-[clamp(10px,3vw,26px)]">
                {podiumOrder.map((idx) => {
                  const c = podium[idx];
                  const rank = idx; // 0-based
                  const isFirst = rank === 0;
                  const size = isFirst ? 108 : 84;
                  return (
                    <Link
                      key={c.login}
                      href={`/${c.login}`}
                      className="group flex flex-col items-center"
                      style={{ marginBottom: isFirst ? 18 : 0 }}
                    >
                      <span className="mb-[6px] text-[clamp(20px,4vw,30px)]" aria-hidden>
                        {MEDAL[rank]}
                      </span>
                      <div
                        className="relative overflow-hidden rounded-full border-2 transition group-hover:-translate-y-[2px]"
                        style={{
                          width: size,
                          height: size,
                          borderColor: inkFor(c.finish),
                          boxShadow: `0 10px 30px -10px ${inkFor(c.finish)}66`,
                        }}
                      >
                        <img
                          src={c.avatarUrl}
                          onError={onAvatarError}
                          alt={c.login}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div
                        className="font-display mt-[8px] text-[clamp(26px,5vw,40px)] leading-none tabular-nums"
                        style={{ color: inkFor(c.finish) }}
                      >
                        {c.overall}
                      </div>
                      <div className="mt-[3px] max-w-[120px] truncate text-center text-[13px] font-semibold text-ink">
                        {c.name || c.login}
                      </div>
                      <div className="font-mono text-[10.5px] tracking-[.08em] text-ink-mute">
                        {c.finishLabel}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* full standings */}
            <div className="mt-[clamp(28px,5vh,44px)] flex flex-col gap-[8px]">
              <div className="font-mono mb-[4px] px-[6px] text-[10.5px] font-bold tracking-[.2em] text-ink-faint">
                STANDINGS
              </div>
              {cards.map((c, i) => (
                <Link
                  key={c.login}
                  href={`/${c.login}`}
                  className="group flex items-center gap-[clamp(10px,2.5vw,16px)] rounded-[12px] border border-line bg-white/[0.02] px-[clamp(10px,2.5vw,16px)] py-[10px] transition hover:-translate-y-[1px] hover:border-white/15 hover:bg-white/[0.04]"
                  style={i < 3 ? { borderColor: `${inkFor(c.finish)}55` } : undefined}
                >
                  <span
                    className="font-display w-[26px] flex-none text-center text-[18px] tabular-nums"
                    style={{ color: i < 3 ? inkFor(c.finish) : "var(--color-ink-mute)" }}
                  >
                    {i < 3 ? MEDAL[i] : i + 1}
                  </span>
                  <img
                    src={c.avatarUrl}
                    onError={onAvatarError}
                    alt=""
                    aria-hidden
                    className="h-[40px] w-[40px] flex-none rounded-full border border-white/10 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold text-ink">{c.name || c.login}</div>
                    <div className="font-mono truncate text-[11.5px] text-ink-mute">
                      @{c.login} · {c.position} · {c.archetype}
                    </div>
                  </div>
                  <span
                    className="font-display hidden flex-none rounded-[6px] px-[9px] py-[3px] text-[11px] tracking-[.06em] min-[520px]:inline"
                    style={{ background: `${inkFor(c.finish)}1a`, color: inkFor(c.finish) }}
                  >
                    {c.finishLabel}
                  </span>
                  <span
                    className="font-display w-[46px] flex-none text-right text-[26px] leading-none tabular-nums"
                    style={{ color: inkFor(c.finish) }}
                  >
                    {c.overall}
                  </span>
                </Link>
              ))}
            </div>

            {failed.length > 0 && (
              <p className="mt-[16px] text-center text-[12.5px] text-ink-mute">
                Couldn&apos;t scout: {failed.map((f) => `@${f}`).join(", ")}
              </p>
            )}
          </>
        )}

        <footer className="relative z-[2] mt-auto flex flex-none items-center justify-center p-[clamp(12px,2.6vh,24px)]">
          <FooterCredit />
        </footer>
      </main>
      <InspiredBy />
    </div>
  );
}
