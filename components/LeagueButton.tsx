"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

// The League entry — the prestige "glow among all" CTA below the duel. Where a
// duel is 1-v-1, a league ranks a whole crew: you + up to four teammates, each
// entered on its own row (the + adds a row), sorted into a 1st / 2nd / 3rd table.
const MAX_TEAMMATES = 4;

export default function LeagueButton({ login }: { login: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<string[]>([""]);
  const [isPending, startTransition] = useTransition();
  const lastInputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Focus the newest row whenever the panel opens or a row is added.
  useEffect(() => {
    if (open) lastInputRef.current?.focus();
  }, [open, rows.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const updateRow = (i: number, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? v : r)));
  const addRow = () =>
    setRows((rs) => (rs.length >= MAX_TEAMMATES ? rs : [...rs, ""]));
  const removeRow = (i: number) =>
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((_, idx) => idx !== i)));

  // Clean, de-duped teammate list (drops @, blanks and the owner's own handle).
  const teammates = () => {
    const seen = new Set([login.toLowerCase()]);
    const out: string[] = [];
    for (const raw of rows) {
      const u = raw.trim().replace(/^@/, "");
      if (u && !seen.has(u.toLowerCase())) {
        seen.add(u.toLowerCase());
        out.push(u);
      }
    }
    return out.slice(0, MAX_TEAMMATES);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const crew = teammates();
    if (!crew.length || isPending) return;
    const players = [login, ...crew];
    startTransition(() =>
      router.push(`/league?players=${encodeURIComponent(players.join(","))}`),
    );
  };

  const count = teammates().length;

  return (
    <div ref={wrapRef} className="flex w-full flex-col gap-[8px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Rank yourself against your crew"
        className="animate-league-glow group relative flex h-[46px] w-full items-center justify-center gap-[10px] overflow-hidden rounded-xl border border-brand/45 bg-gradient-to-b from-brand/[0.16] to-brand/[0.05] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:from-brand/25 hover:to-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 active:translate-y-0 active:scale-[.985]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-brand/[0.14] to-transparent motion-safe:animate-[duel-sweep_7s_ease-in-out_infinite]"
        />
        <span aria-hidden className="text-[17px] leading-none">🏆</span>
        <span className="font-display text-[19px] tracking-[.1em] text-brand-hi">LEAGUE</span>
        <span className="font-mono text-[10.5px] font-semibold tracking-[.14em] text-ink-soft">
          RANK YOUR CREW
        </span>
      </button>

      {open && (
        <form
          onSubmit={submit}
          aria-busy={isPending}
          className="animate-pop flex w-full flex-col gap-[8px] rounded-xl border border-line bg-white/[0.03] p-[8px]"
        >
          {rows.map((val, i) => (
            <div key={i} className="flex items-center gap-[6px]">
              <input
                ref={i === rows.length - 1 ? lastInputRef : undefined}
                value={val}
                onChange={(e) => updateRow(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && !isPending) setOpen(false);
                }}
                placeholder={`teammate ${i + 1} username`}
                autoComplete="off"
                spellCheck={false}
                readOnly={isPending}
                aria-label={`Teammate ${i + 1} LeetCode username`}
                className="font-mono h-[34px] w-full min-w-0 flex-1 rounded-[8px] border border-line bg-bg/80 px-[10px] text-[13.5px] text-white outline-none transition placeholder:text-ink-faint focus:border-brand/60 focus:shadow-[0_0_0_3px_rgba(255,161,22,.14)] max-lg:pointer-coarse:text-[16px]"
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label={`Remove teammate ${i + 1}`}
                  className="flex h-[34px] w-[30px] flex-none items-center justify-center rounded-[8px] border border-line text-ink-faint transition hover:border-white/20 hover:text-ink"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}

          <div className="mt-[2px] flex items-center justify-between gap-[8px]">
            <button
              type="button"
              onClick={addRow}
              disabled={rows.length >= MAX_TEAMMATES}
              aria-label="Add another teammate"
              className="inline-flex h-[32px] items-center gap-[6px] rounded-[8px] border border-brand/40 bg-brand/[0.08] px-[11px] text-[12.5px] font-semibold tracking-[.04em] text-brand-hi transition hover:bg-brand/15 disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-ink-mute"
            >
              <Plus size={15} strokeWidth={2.6} />
              {rows.length >= MAX_TEAMMATES ? "max 4" : "add teammate"}
            </button>
            <button
              type="submit"
              disabled={isPending || count === 0}
              aria-label="See the standings"
              className="font-display flex h-[32px] min-w-[112px] shrink-0 items-center justify-center gap-[7px] rounded-[8px] bg-gradient-to-b from-brand to-brand-mid px-[13px] text-[14px] tracking-[.07em] text-[#1a1305] transition hover:from-brand-hi hover:to-brand disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isPending ? (
                <span className="h-[13px] w-[13px] animate-spin rounded-full border-[1.5px] border-black/25 border-t-black/70" />
              ) : (
                <>
                  STANDINGS
                  <span aria-hidden className="text-[15px] leading-none">→</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
