"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

// The Derby entry — 3-a-side. Where a Duel is you against one card and a League
// ranks a crew, a derby is two SQUADS: you pick the two who play alongside you,
// then name the three you're playing against. You always start on the teamsheet,
// so your side takes two more; theirs takes three.
const MATES = 2; // alongside you — you are the third
const OPPO = 3;

export default function DerbyButton({ login }: { login: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mates, setMates] = useState<string[]>([""]);
  const [oppo, setOppo] = useState<string[]>([""]);
  const [isPending, startTransition] = useTransition();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) firstInputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Clean, de-duped squads. One player, one club: a handle already on the pitch
  // (including your own) can't be named again on either sheet.
  const squads = () => {
    const taken = new Set([login.toLowerCase()]);
    const pick = (rows: string[], max: number) => {
      const out: string[] = [];
      for (const raw of rows) {
        const u = raw.trim().replace(/^@/, "");
        if (u && !taken.has(u.toLowerCase())) {
          taken.add(u.toLowerCase());
          out.push(u);
        }
      }
      return out.slice(0, max);
    };
    const home = [login, ...pick(mates, MATES)];
    return { home, away: pick(oppo, OPPO) };
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { home, away } = squads();
    if (!away.length || isPending) return;
    startTransition(() =>
      router.push(
        `/derby?home=${encodeURIComponent(home.join(","))}&away=${encodeURIComponent(away.join(","))}`,
      ),
    );
  };

  const away = squads().away;

  // One squad's worth of rows — the two sheets are the same control, so they
  // behave identically and only differ in their cap and copy.
  const sheet = (
    rows: string[],
    setRows: (fn: (rs: string[]) => string[]) => void,
    max: number,
    label: string,
    placeholder: (i: number) => string,
    first: boolean,
  ) => (
    <div className="flex flex-col gap-[6px]">
      <div className="font-mono px-[2px] text-[9.5px] font-bold tracking-[.18em] text-ink-mute">
        {label}
      </div>
      {rows.map((val, i) => (
        <div key={i} className="flex items-center gap-[6px]">
          <input
            ref={first && i === 0 ? firstInputRef : undefined}
            value={val}
            onChange={(e) => setRows((rs) => rs.map((r, idx) => (idx === i ? e.target.value : r)))}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !isPending) setOpen(false);
            }}
            placeholder={placeholder(i)}
            autoComplete="off"
            spellCheck={false}
            readOnly={isPending}
            aria-label={`${label} ${i + 1} LeetCode username`}
            className="font-mono h-[32px] w-full min-w-0 flex-1 rounded-[8px] border border-line bg-bg/80 px-[9px] text-[13px] text-white outline-none transition placeholder:text-ink-faint focus:border-[#5ad1e5]/60 focus:shadow-[0_0_0_3px_rgba(90,209,229,.14)] max-lg:pointer-coarse:text-[16px]"
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
              aria-label={`Remove ${label} ${i + 1}`}
              className="flex h-[32px] w-[28px] flex-none items-center justify-center rounded-[8px] border border-line text-ink-faint transition hover:border-white/20 hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {rows.length < max && (
        <button
          type="button"
          onClick={() => setRows((rs) => (rs.length >= max ? rs : [...rs, ""]))}
          className="inline-flex h-[28px] w-fit items-center gap-[5px] rounded-[8px] border border-[#5ad1e5]/35 bg-[#5ad1e5]/[0.07] px-[9px] text-[11.5px] font-semibold tracking-[.03em] text-[#8fe3f0] transition hover:bg-[#5ad1e5]/15"
        >
          <Plus size={13} strokeWidth={2.6} />
          add player
        </button>
      )}
    </div>
  );

  return (
    <div ref={wrapRef} className="flex w-full flex-col gap-[8px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Take a squad of three onto the pitch"
        className="animate-derby-glow group relative flex h-[46px] w-full items-center justify-center gap-[10px] overflow-hidden rounded-xl border border-[#5ad1e5]/45 bg-gradient-to-b from-[#5ad1e5]/[0.16] to-[#5ad1e5]/[0.05] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:from-[#5ad1e5]/25 hover:to-[#5ad1e5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ad1e5]/60 active:translate-y-0 active:scale-[.985]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#5ad1e5]/[0.14] to-transparent motion-safe:animate-[duel-sweep_7s_ease-in-out_infinite]"
        />
        <span aria-hidden className="text-[17px] leading-none">
          ⚽
        </span>
        <span className="font-display text-[19px] tracking-[.1em] text-[#8fe3f0]">DERBY</span>
        <span className="font-mono text-[10.5px] font-semibold tracking-[.14em] text-ink-soft">
          3 v 3
        </span>
      </button>

      {open && (
        <form
          onSubmit={submit}
          aria-busy={isPending}
          className="animate-pop flex w-full flex-col gap-[10px] rounded-xl border border-line bg-white/[0.03] p-[9px]"
        >
          {sheet(
            mates,
            setMates,
            MATES,
            "YOUR SIDE",
            (i) => `teammate ${i + 1} (optional)`,
            true,
          )}
          <div className="flex items-center gap-[8px]">
            <span className="h-px flex-1 bg-line" />
            <span className="font-display text-[11px] tracking-[.2em] text-ink-mute">VS</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          {sheet(oppo, setOppo, OPPO, "OPPOSITION", (i) => `opponent ${i + 1}`, false)}

          <button
            type="submit"
            disabled={isPending || away.length === 0}
            aria-label="Kick off the derby"
            className="font-display mt-[2px] flex h-[34px] w-full shrink-0 items-center justify-center gap-[7px] rounded-[8px] bg-gradient-to-b from-[#5ad1e5] to-[#2fa9bf] px-[13px] text-[14px] tracking-[.07em] text-[#04222a] transition hover:from-[#7fe4f4] hover:to-[#3fbdd4] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? (
              <span className="h-[13px] w-[13px] animate-spin rounded-full border-[1.5px] border-black/25 border-t-black/70" />
            ) : (
              <>
                KICK OFF
                <span aria-hidden className="text-[15px] leading-none">
                  →
                </span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
