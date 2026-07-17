"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Link2, Repeat, Share2 } from "lucide-react";
import type { Card } from "@/lib/scoring/types";
import {
  computeDerby,
  derbyDominance,
  tallyDerby,
  type Derby,
  type DerbyRow,
  type DerbySide,
} from "@/lib/derby";
import DerbyPitch from "./DerbyPitch";
import FooterCredit from "./FooterCredit";
import { XLogo } from "./BrandIcons";
import { derbyKits, rgba, type ResultTheme } from "./finishTheme";
import { useDerbyReveal } from "@/hooks/useReveal";
import { useShareActions } from "@/hooks/useShareActions";
import { resolvedRows } from "@/lib/reveal";
import { formatCount } from "@/lib/format";
import { derbyIntentUrl, derbySharePayload, derbyUrl } from "@/lib/share";

// THE DERBY — 3-a-side. Two squads, one pitch, the six stats as the six chances.
// The data half of this file mirrors The League (client-side scout of N logins);
// the broadcast half mirrors The Duel (a pure sequencer drives the reveal).

// One stat as a team-vs-team butterfly bar — the Duel's graphic, team means.
function AttackBar({
  row,
  resolved,
  kits,
}: {
  row: DerbyRow;
  resolved: boolean;
  kits: { home: ResultTheme; away: ResultTheme };
}) {
  const value = (side: DerbySide) => {
    const accent = kits[side].ink;
    const won = row.winner === side;
    const lost = row.winner !== null && !won;
    return (
      <span
        className={`inline-flex items-center gap-[6px] ${side === "home" ? "flex-row" : "flex-row-reverse"}`}
      >
        <span
          className="font-display text-[clamp(15px,2vw,20px)] leading-none tabular-nums"
          style={{
            color: won ? accent : lost ? "var(--color-ink-mute)" : "var(--color-ink-soft)",
            textShadow: won ? `0 0 12px ${rgba(accent, 0.4)}` : undefined,
          }}
        >
          {row[side]}
        </span>
        {/* the goal dot — a non-color cue, so the row is readable without kits */}
        {won && (
          <span
            aria-hidden
            className="h-[4px] w-[4px] shrink-0 rounded-full"
            style={{ background: accent, boxShadow: `0 0 7px ${rgba(accent, 0.55)}` }}
          />
        )}
      </span>
    );
  };
  const bar = (side: DerbySide) => {
    const accent = kits[side].ink;
    const won = row.winner === side;
    const lost = row.winner !== null && !won;
    return (
      <div
        className={`flex h-[6px] w-full overflow-hidden rounded-full bg-white/[0.05] ${
          side === "home" ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${resolved ? (row[side] / 99) * 100 : 0}%`,
            background: lost ? rgba(accent, 0.45) : accent,
            boxShadow: won ? `0 0 10px ${rgba(accent, 0.5)}` : undefined,
            transition: "width .6s cubic-bezier(.16,1,.3,1), background .3s ease",
          }}
        />
      </div>
    );
  };
  return (
    <div
      className="grid grid-cols-[minmax(28px,auto)_1fr_44px_1fr_minmax(28px,auto)] items-center gap-[8px] rounded-lg px-[6px] py-[5px] transition-colors duration-200 hover:bg-white/[0.04]"
      style={
        resolved
          ? { animation: "gf-row-resolve .45s cubic-bezier(.16,1,.3,1) both" }
          : { opacity: 0.3 }
      }
    >
      <span className="flex justify-end">{resolved ? value("home") : <Masked />}</span>
      {bar("home")}
      <span className="font-display text-center text-[10.5px] tracking-[.24em] text-ink-mute">
        {row.label}
      </span>
      {bar("away")}
      <span className="flex justify-start">{resolved ? value("away") : <Masked />}</span>
    </div>
  );
}

const Masked = () => (
  <span aria-hidden className="font-display text-[clamp(15px,2vw,20px)] leading-none text-ink-mute">
    ··
  </span>
);

function ScoreDigit({ value, accent }: { value: number; accent: string }) {
  return (
    <span
      key={value}
      className="inline-block tabular-nums"
      style={{ color: accent, animation: "gf-score-tick .38s cubic-bezier(.16,1,.3,1) both" }}
    >
      {value}
    </span>
  );
}

function Broadcast({ derby, homeLogins, awayLogins }: { derby: Derby; homeLogins: string[]; awayLogins: string[] }) {
  const { home, away, rows, winner, onPenalties, training } = derby;
  const kits = derbyKits(home.captain, away.captain);
  const { phase, skip } = useDerbyReveal();
  const settled = phase.kind === "settled";
  const stamped = phase.kind === "result" || settled;
  const shown = resolvedRows(phase);
  const kicked = phase.kind !== "walkout";

  // Everything on screen counts only the attacks that have actually resolved, so
  // the scoreboard, the pitch and the dominance bar can never run ahead of it.
  const visible = rows.slice(0, shown);
  const { home: scoreH, away: scoreA } = tallyDerby(visible);
  const pctH = derbyDominance(visible);

  const focus: DerbySide | null = stamped ? winner : null;
  const winnerTeam = winner ? derby[winner] : null;
  const resultAccent = winner ? kits[winner].ink : "var(--color-ink-faint)";
  const headlineHex = winner ? kits[winner].ink : "#b3b3b3";

  const { canNativeShare, nativeShare, copyLink, linkCopied } = useShareActions({
    getSharePayload: () => derbySharePayload(homeLogins, awayLogins),
    getIntentUrl: () => derbyIntentUrl(homeLogins, awayLogins),
    getCopyUrl: () => derbyUrl(homeLogins, awayLogins),
  });

  const status = !stamped && shown === 0 ? "KICK-OFF" : !stamped ? "LIVE" : "FULL TIME";
  const goals = derby.scorers.filter((s) => s.row < shown);

  const teamsheet = (side: DerbySide) => {
    const team = derby[side];
    const kit = kits[side];
    return (
      <div className={`min-w-0 ${side === "home" ? "text-right" : "text-left"}`}>
        <div
          className="font-display truncate text-[clamp(15px,2.6vw,30px)] leading-[1.05]"
          style={{ color: kit.ink }}
          title={team.name}
        >
          {team.name}
        </div>
        <div className="font-mono text-[10px] tracking-[.1em] text-ink-mute">
          {team.rating} RATED · {team.squad.length}
          {team.squad.length === 1 ? " PLAYER" : " PLAYERS"}
        </div>
      </div>
    );
  };

  return (
    <main
      onClick={
        settled
          ? undefined
          : (e) => {
              if ((e.target as HTMLElement).closest('a,button,[role="button"]')) return;
              skip();
            }
      }
      className="relative z-[2] mx-auto flex min-h-screen w-full max-w-[1040px] flex-col px-[clamp(14px,4vw,24px)] py-[clamp(16px,3vh,26px)]"
    >
      {/* The stadium leans, exactly as it does in the Duel: each side's kit
          floods its half and brightens as that side scores, then flares for the
          winner. FIXED and solid — this is a broadcast, not a lobby, so it does
          NOT wear the home screen's panorama (which is absolute, and on a page
          this tall would stretch the stadium up behind the stats and eat them). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "var(--color-bg)" }}
      >
        <div
          className="absolute inset-y-0 left-0 w-[62%] transition-opacity duration-700"
          style={{
            background: `radial-gradient(85% 70% at 18% 30%, ${kits.home.glow}, transparent 70%)`,
            opacity: 0.28 + scoreH * 0.11 + (focus === "home" ? 0.16 : 0),
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-[62%] transition-opacity duration-700"
          style={{
            background: `radial-gradient(85% 70% at 82% 30%, ${kits.away.glow}, transparent 70%)`,
            opacity: 0.28 + scoreA * 0.11 + (focus === "away" ? 0.16 : 0),
          }}
        />
      </div>

      {/* top bar */}
      <div className="mb-[clamp(12px,3vh,22px)] flex items-center justify-between gap-[10px]">
        <Link
          href="/"
          className="group inline-flex items-center gap-[6px] text-[13px] font-medium tracking-wide text-ink-faint transition hover:text-ink"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          LEETFUT
        </Link>
        <img
          src="/leetfutlogo.webp"
          alt="LeetFut"
          draggable={false}
          className="h-[34px] w-auto select-none rounded-[8px]"
        />
      </div>

      <div className="text-center">
        <div className="font-mono mb-[8px] text-[11px] font-semibold tracking-[.3em] text-brand">
          3-A-SIDE · LEETCODE × WORLD CUP 26
        </div>
        <h1 className="font-fantasy m-0 text-[clamp(30px,6vw,54px)] font-bold leading-[1] tracking-[.015em]">
          THE DERBY<span className="text-brand">.</span>
        </h1>
      </div>

      {/* the fixture: teamsheets flanking the scoreline */}
      <div className="mt-[clamp(14px,3vh,26px)] grid grid-cols-[1fr_auto_1fr] items-center gap-[clamp(8px,2.5vw,22px)]">
        {teamsheet("home")}
        <div className="flex flex-col items-center">
          <div
            role="status"
            aria-live="polite"
            className="font-display flex items-center gap-[7px] text-[10.5px] font-bold tracking-[.24em] text-ink-faint"
          >
            {status === "LIVE" && (
              <span className="relative flex h-[6px] w-[6px]" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-brand" />
              </span>
            )}
            {status}
            {stamped && onPenalties && <span className="text-gold-hi">· PENS</span>}
          </div>
          <div className="font-display mt-[1px] flex items-baseline gap-[clamp(8px,1.6vw,16px)] text-[clamp(40px,7vw,74px)] font-black leading-[.9]">
            <ScoreDigit value={scoreH} accent={kits.home.ink} />
            <span className="text-[0.5em] text-ink-mute">–</span>
            <ScoreDigit value={scoreA} accent={kits.away.ink} />
          </div>
        </div>
        {teamsheet("away")}
      </div>

      {/* The ground. Capped by viewport HEIGHT (not just width) so the pitch
          never grows so tall it pushes the chances and the scoreline apart —
          the max-width carries the 16/9 with it, so the markings stay true. */}
      <div
        className="mx-auto mt-[clamp(12px,2.4vh,20px)] w-full"
        style={{ maxWidth: "min(100%, calc(52vh * 16 / 9))" }}
      >
        <DerbyPitch derby={derby} kits={kits} shown={shown} kicked={kicked} focus={focus} />
      </div>

      {kits.changed && (
        <p className="font-mono mt-[7px] text-center text-[10px] tracking-[.08em] text-ink-mute">
          kit clash — {away.name} in the change strip
        </p>
      )}

      {/* dominance */}
      <div className="mt-[clamp(12px,2.4vh,20px)] w-full px-[4px]">
        <div className="font-display flex items-center justify-between text-[11px] font-bold tracking-[.24em] text-ink-faint">
          <span className="tabular-nums" style={{ color: kits.home.ink }}>
            {pctH}%
          </span>
          <span>DOMINANCE</span>
          <span className="tabular-nums" style={{ color: kits.away.ink }}>
            {100 - pctH}%
          </span>
        </div>
        <div className="mt-[6px] flex h-[8px] w-full overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full"
            style={{
              width: `${pctH}%`,
              background: kits.home.ink,
              boxShadow: `0 0 10px ${rgba(kits.home.ink, 0.4)}`,
              transition: "width .7s cubic-bezier(.16,1,.3,1)",
            }}
          />
          <div className="h-full flex-1" style={{ background: rgba(kits.away.ink, 0.9) }} />
        </div>
      </div>

      {/* the attacks + the ticker */}
      <div className="mt-[clamp(14px,2.6vh,22px)] grid grid-cols-[1fr_minmax(220px,280px)] gap-[clamp(12px,2.4vw,26px)] max-[820px]:grid-cols-1">
        <section>
          <div className="font-mono mb-[5px] px-[6px] text-[10.5px] font-bold tracking-[.2em] text-ink-faint">
            THE CHANCES · SQUAD AVERAGES
          </div>
          <div className="flex flex-col gap-[2px]">
            {rows.map((row, i) => (
              <AttackBar key={row.key} row={row} resolved={i < shown} kits={kits} />
            ))}
          </div>
        </section>

        <section className="rounded-[12px] border border-line bg-white/[0.02] p-[10px]">
          <div className="font-mono mb-[7px] text-[10.5px] font-bold tracking-[.2em] text-ink-faint">
            GOALS
          </div>
          {goals.length === 0 ? (
            <p className="py-[10px] text-center text-[12px] text-ink-mute">
              {shown === 0 ? "waiting for the whistle…" : "no goals yet"}
            </p>
          ) : (
            <ul className="flex flex-col gap-[5px]">
              {goals.map((g) => (
                <li
                  key={`${g.row}-${g.login}`}
                  className="flex items-center gap-[7px] text-[12px]"
                  style={{ animation: "gf-row-resolve .4s cubic-bezier(.16,1,.3,1) both" }}
                >
                  <span aria-hidden className="text-[11px] leading-none">
                    ⚽
                  </span>
                  <Link
                    href={`/${g.login}`}
                    className="min-w-0 flex-1 truncate font-semibold transition hover:underline"
                    style={{ color: kits[g.side].ink }}
                  >
                    {g.name}
                  </Link>
                  <span className="font-mono shrink-0 text-[10px] text-ink-mute">{g.label}</span>
                  <span className="font-mono shrink-0 text-[10px] tabular-nums text-ink-faint">
                    {g.minute}&apos;
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* man of the match */}
          <div
            className="mt-[10px] border-t border-line pt-[9px] transition-opacity duration-500"
            style={{ opacity: stamped ? 1 : 0 }}
          >
            <div className="font-mono mb-[6px] text-[10.5px] font-bold tracking-[.2em] text-ink-faint">
              MAN OF THE MATCH
            </div>
            {stamped && derby.motm ? (
              <Link href={`/${derby.motm.card.login}`} className="group flex items-center gap-[8px]">
                <img
                  src={derby.motm.card.avatarUrl}
                  alt=""
                  aria-hidden
                  className="h-[34px] w-[34px] shrink-0 rounded-full object-cover"
                  style={{ border: `2px solid ${kits[derby.motm.side].ink}` }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink group-hover:underline">
                    {derby.motm.card.name || derby.motm.card.login}
                  </div>
                  <div className="font-mono truncate text-[10.5px] text-ink-mute">
                    {derby.motm.goals} {derby.motm.goals === 1 ? "goal" : "goals"} ·{" "}
                    {derby.motm.card.overall} OVR
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-[12px] text-ink-mute">
                {stamped ? "nobody scored. nobody gets it." : "—"}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* full time */}
      <div
        role="status"
        aria-live="polite"
        className="mt-[clamp(16px,3vh,30px)] flex min-h-[clamp(88px,11vh,120px)] w-full items-center justify-center"
      >
        {stamped ? (
          <div
            className="flex w-full flex-col items-center text-center"
            style={{ animation: "rise-soft .55s cubic-bezier(.16,1,.3,1) both" }}
          >
            <div className="flex items-center justify-center gap-[10px]">
              <span
                className="h-px w-[clamp(20px,4vw,40px)]"
                style={{ background: `linear-gradient(90deg, transparent, ${resultAccent})` }}
              />
              <span
                className="font-display text-[11px] font-bold tracking-[.34em]"
                style={{ color: resultAccent }}
              >
                {onPenalties ? "AFTER PENALTIES" : "FULL TIME"}
              </span>
              <span
                className="h-px w-[clamp(20px,4vw,40px)]"
                style={{ background: `linear-gradient(90deg, ${resultAccent}, transparent)` }}
              />
            </div>

            <div className="relative mt-[8px]">
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[150%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[38px]"
                style={{
                  background: `radial-gradient(closest-side, ${rgba(headlineHex, 0.3)}, transparent 72%)`,
                }}
              />
              {winnerTeam ? (
                <div
                  className="font-display text-[clamp(24px,4vw,44px)] font-black leading-[.92]"
                  style={{
                    backgroundImage: `linear-gradient(100deg, ${headlineHex} 0%, ${headlineHex} 42%, #ffffff 50%, ${headlineHex} 58%, ${headlineHex} 100%)`,
                    backgroundSize: "220% 100%",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    filter: `drop-shadow(0 2px 16px ${rgba(headlineHex, 0.32)})`,
                    animation: "gf-name-shimmer 3.4s ease-in-out .25s both",
                  }}
                >
                  {winnerTeam.name.toUpperCase()}
                </div>
              ) : (
                <div className="font-display text-[clamp(24px,4vw,44px)] font-black leading-[.92] text-ink">
                  {training ? "A DRAW. OBVIOUSLY." : "ALL SQUARE"}
                </div>
              )}
            </div>

            <span
              className="mt-[9px] block h-[2.5px] w-[90px] rounded-full"
              style={{
                background: resultAccent,
                transformOrigin: "center",
                animation: "gf-underline .55s .18s cubic-bezier(.16,1,.3,1) both",
              }}
            />

            <div className="mt-[9px] text-[12.5px] leading-snug text-ink-soft">
              {winner && onPenalties
                ? `dead level — a ${derby[winner].rating}-rated squad settles it from the spot`
                : winner
                  ? `${derby.score[winner]}–${derby.score[winner === "home" ? "away" : "home"]} across the six stats`
                  : training
                    ? "you can't nutmeg yourself"
                    : "six stats, nothing between them — rematch demanded"}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={skip}
            className="text-[11.5px] font-medium text-ink-mute transition hover:text-ink-soft"
          >
            tap anywhere to skip
          </button>
        )}
      </div>

      {/* receipts + share */}
      {/* The receipts read as a column of pairs, so they're kept to the share
          row's width — stretched to the full page they'd strand each number a
          long way from the label it belongs to. */}
      <div
        className="mx-auto w-full max-w-[460px] transition-opacity duration-700"
        style={{ opacity: settled ? 1 : 0, visibility: settled ? "visible" : "hidden" }}
      >
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-[14px]">
          <div className="mb-[8px] flex items-center justify-center gap-[9px]">
            <span className="h-[2px] w-[16px] rounded-full" style={{ background: kits.home.ink }} />
            <h3 className="font-display text-[11px] font-bold tracking-[.22em] text-ink-faint">
              THE RECEIPTS
            </h3>
            <span className="h-[2px] w-[16px] rounded-full" style={{ background: kits.away.ink }} />
          </div>
          {/* context, never score: real team numbers, no winner highlighting */}
          {derby.receipts.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-[10px] border-b border-white/[0.06] py-[7px] last:border-0"
            >
              <span className="text-right font-mono text-[13px] tabular-nums text-ink-dim">
                {formatCount(r.home)}
              </span>
              <span className="w-[144px] text-center text-[11px] text-ink-mute">{r.label}</span>
              <span className="text-left font-mono text-[13px] tabular-nums text-ink-dim">
                {formatCount(r.away)}
              </span>
            </div>
          ))}
        </section>

        <div className="mt-[10px] flex flex-col gap-[8px]">
          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              className="font-display group relative flex h-[46px] w-full items-center justify-center gap-[9px] overflow-hidden rounded-xl bg-gradient-to-b from-brand to-brand-mid text-[17px] tracking-[.05em] text-[#1a1305] shadow-[0_0_0_1px_rgba(255,161,22,.45),0_10px_28px_-6px_rgba(255,161,22,.5)] transition-all duration-200 ease-out hover:-translate-y-[1px] active:translate-y-0 active:scale-[.985]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
              />
              <Share2 size={17} strokeWidth={2.5} className="relative" />
              <span className="relative">SHARE THE DERBY</span>
            </button>
          )}
          <div className="grid w-full grid-cols-3 gap-[8px]">
            <button
              type="button"
              onClick={() =>
                window.open(derbyIntentUrl(homeLogins, awayLogins), "_blank", "noopener,noreferrer")
              }
              title="Share on X"
              aria-label="Share on X"
              className="group flex items-center justify-center gap-[7px] rounded-xl border border-line bg-white/[0.03] py-[11px] text-[12.5px] font-semibold text-ink-soft transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-white/25 hover:bg-white/[0.07] hover:text-white active:translate-y-0 active:scale-[.98]"
            >
              <XLogo size={14} />
              <span className="max-[360px]:hidden">X</span>
            </button>
            <button
              type="button"
              onClick={copyLink}
              title="Copy link to this derby"
              aria-label="Copy link to this derby"
              className="group flex items-center justify-center gap-[7px] rounded-xl border border-line bg-white/[0.03] py-[11px] text-[12.5px] font-semibold text-ink-soft transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-brand/50 hover:bg-brand/[0.08] hover:text-white active:translate-y-0 active:scale-[.98]"
            >
              {linkCopied ? <Check size={14} className="text-brand" /> : <Link2 size={14} />}
              <span className="max-[360px]:hidden">{linkCopied ? "Copied" : "Copy link"}</span>
            </button>
            <Link
              href={derbyUrl(awayLogins, homeLogins).replace("https://leetfut.com", "")}
              title="Rematch with the squads swapped"
              aria-label="Rematch with the squads swapped"
              className="group flex items-center justify-center gap-[7px] rounded-xl border border-line bg-white/[0.03] py-[11px] text-[12.5px] font-semibold text-ink-soft transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-white/25 hover:bg-white/[0.07] hover:text-white active:translate-y-0 active:scale-[.98]"
            >
              <Repeat size={14} />
              <span className="max-[360px]:hidden">Swap ends</span>
            </Link>
          </div>
        </div>
      </div>

      <footer className="relative z-[2] mt-auto flex flex-none items-center justify-center p-[clamp(12px,2.6vh,24px)]">
        <FooterCredit />
      </footer>
    </main>
  );
}

const clean = (names: string[], taken: Set<string>): string[] => {
  const out: string[] = [];
  for (const raw of names) {
    const u = raw.trim().replace(/^@/, "");
    if (u && !taken.has(u.toLowerCase())) {
      taken.add(u.toLowerCase());
      out.push(u);
    }
  }
  return out.slice(0, 3);
};

export default function DerbyView({ home, away }: { home: string[]; away: string[] }) {
  // A player can only turn out for one club: home is picked first, and any
  // repeat on the away sheet is dropped rather than cloned onto both pitches.
  const logins = useMemo(() => {
    const taken = new Set<string>();
    return { home: clean(home, taken), away: clean(away, taken) };
  }, [home, away]);

  const [squads, setSquads] = useState<{ home: Card[]; away: Card[] } | null>(null);
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    // All setState lives inside the async runner (never synchronously in the
    // effect body) so a fetch cycle can't cascade renders on mount.
    const run = async () => {
      if (alive) {
        setSquads(null);
        setFailed([]);
      }
      const scout = async (u: string) => {
        try {
          const r = await fetch(`/api/card/${encodeURIComponent(u)}`);
          if (!r.ok) return { u, card: null };
          return { u, card: (await r.json()) as Card };
        } catch {
          return { u, card: null };
        }
      };
      const [h, a] = await Promise.all([
        Promise.all(logins.home.map(scout)),
        Promise.all(logins.away.map(scout)),
      ]);
      if (!alive) return;
      setSquads({
        home: h.filter((r) => r.card).map((r) => r.card as Card),
        away: a.filter((r) => r.card).map((r) => r.card as Card),
      });
      setFailed([...h, ...a].filter((r) => !r.card).map((r) => r.u));
    };
    void run();
    return () => {
      alive = false;
    };
  }, [logins]);

  // A derby needs somebody in both dugouts; anything less is a walkover, not a
  // match, so we say so rather than drawing an empty half.
  const playable = squads && squads.home.length > 0 && squads.away.length > 0;
  const derby = useMemo(
    () => (playable ? computeDerby(squads.home, squads.away) : null),
    [playable, squads],
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg text-ink">
      {squads === null ? (
        <main className="relative z-[2] flex min-h-screen flex-col items-center justify-center gap-[14px] text-ink-faint">
          <span className="h-[26px] w-[26px] animate-spin rounded-full border-[2px] border-brand/25 border-t-brand" />
          <span className="font-mono text-[13px] tracking-[.06em]">Naming the squads…</span>
        </main>
      ) : !derby ? (
        <main className="relative z-[2] flex min-h-screen flex-col items-center justify-center gap-[10px] px-[20px] text-center">
          <p className="text-[15px] text-ink-dim">
            A derby needs a squad on both sides
            {failed.length > 0 ? ` — couldn't scout ${failed.map((f) => `@${f}`).join(", ")}` : "."}
          </p>
          <Link href="/" className="font-display text-[15px] tracking-[.06em] text-brand hover:text-brand-hi">
            ← BACK TO SCOUT
          </Link>
        </main>
      ) : (
        <>
          <Broadcast
            // A new fixture is a new match: remount so the broadcast replays
            // from kick-off rather than resuming mid-sequence.
            key={`${logins.home.join(",")}|${logins.away.join(",")}`}
            derby={derby}
            homeLogins={derby.home.squad.map((c) => c.login)}
            awayLogins={derby.away.squad.map((c) => c.login)}
          />
          {failed.length > 0 && (
            <p className="relative z-[2] pb-[14px] text-center text-[12px] text-ink-mute">
              Couldn&apos;t scout: {failed.map((f) => `@${f}`).join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
