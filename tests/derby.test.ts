import { describe, expect, it } from "vitest";
import {
  computeDerby,
  derbyDominance,
  pitchOrder,
  slotsFor,
  tallyDerby,
} from "@/lib/derby";
import { derbyKits, kitsClash } from "@/components/finishTheme";
import { METRIC_LABELS } from "@/lib/scoring/attributes";
import { derbySequenceFor } from "@/lib/reveal";
import type { Card, Family, Stats } from "@/lib/scoring/types";

const mkCard = (
  login: string,
  stats: Stats,
  overall: number,
  extras: {
    family?: Family;
    finish?: Card["finish"];
    metrics?: { label: string; value: number }[];
  } = {},
): Card => ({
  login,
  name: login,
  avatarUrl: `https://leetcode.com/${login}.png`,
  country: "",
  club: "neutral",
  stats,
  position: "CM",
  family: extras.family ?? "Playmaker",
  baseOVR: overall,
  overall,
  finish: extras.finish ?? "gold",
  finishLabel: "GOLD",
  archetype: "Mezzala",
  archetypeBlurb: "",
  legacy: { L: 0 },
  report: {
    skillMoves: 3,
    weakFoot: 3,
    workRate: { attack: "Med", defense: "Med" },
    style: "Measured",
    reasons: { skillMoves: "", weakFoot: "", workRate: "", style: "" },
    playstyles: [],
    metrics: (extras.metrics ?? []).map((m) => ({ ...m, score: 50 })),
  },
});

const stats = (
  pac: number,
  sho: number,
  pas: number,
  dri: number,
  def: number,
  phy: number,
): Stats => ({ pac, sho, pas, dri, def, phy });

/** A squad of three whose every member carries the same flat stat line. */
const flatSquad = (prefix: string, v: number, overall = 70): Card[] =>
  [0, 1, 2].map((i) =>
    mkCard(`${prefix}${i}`, stats(v, v, v, v, v, v), overall),
  );

describe("computeDerby", () => {
  it("scores on squad MEANS, not sums — the better average takes the chance", () => {
    // Home means 60 across the board; away a flat 61. Away edges every stat by
    // one, so it is 0–6 despite home holding the single best player on the pitch.
    const home = [
      mkCard("h0", stats(90, 90, 90, 90, 90, 90), 80),
      mkCard("h1", stats(60, 60, 60, 60, 60, 60), 70),
      mkCard("h2", stats(30, 30, 30, 30, 30, 30), 60),
    ];
    const away = flatSquad("a", 61);
    const derby = computeDerby(home, away);
    expect(derby.rows.map((r) => r.home)).toEqual([60, 60, 60, 60, 60, 60]);
    expect(derby.score).toEqual({ home: 0, away: 6 });
    expect(derby.winner).toBe("away");
  });

  it("a level stat scores for neither side", () => {
    const home = [mkCard("h", stats(90, 50, 50, 50, 50, 50), 70)];
    const away = [mkCard("a", stats(10, 50, 50, 50, 50, 50), 70)];
    const derby = computeDerby(home, away);
    expect(derby.score).toEqual({ home: 1, away: 0 });
    expect(derby.rows.filter((r) => r.winner === null)).toHaveLength(5);
  });

  it("is fair to a short squad — a 2-player team isn't punished for the empty shirt", () => {
    // A sum would read 140 vs 210 and hand away every stat. The mean reads the
    // truth: away's players are individually worse.
    const home = [
      mkCard("h0", stats(70, 70, 70, 70, 70, 70), 75),
      mkCard("h1", stats(70, 70, 70, 70, 70, 70), 75),
    ];
    const away = flatSquad("a", 65);
    const derby = computeDerby(home, away);
    expect(derby.score).toEqual({ home: 6, away: 0 });
    expect(derby.winner).toBe("home");
  });

  it("a level scoreline goes to penalties: the better team RATING takes it", () => {
    const home = [mkCard("h", stats(90, 90, 90, 10, 10, 10), 70)];
    const away = [mkCard("a", stats(10, 10, 10, 90, 90, 90), 80)];
    const derby = computeDerby(home, away);
    expect(derby.score).toEqual({ home: 3, away: 3 });
    expect(derby.winner).toBe("away");
    expect(derby.onPenalties).toBe(true);
  });

  it("the scoreline outranks the rating: a worse-rated team can win the derby", () => {
    const home = [mkCard("h", stats(60, 60, 60, 60, 60, 10), 65)];
    const away = [mkCard("a", stats(50, 50, 50, 50, 50, 95), 90)];
    const derby = computeDerby(home, away);
    expect(derby.score).toEqual({ home: 5, away: 1 });
    expect(derby.winner).toBe("home");
    expect(derby.onPenalties).toBe(false);
  });

  it("level scoreline and level rating is a draw", () => {
    const home = [mkCard("h", stats(90, 90, 90, 10, 10, 10), 75)];
    const away = [mkCard("a", stats(10, 10, 10, 90, 90, 90), 75)];
    const derby = computeDerby(home, away);
    expect(derby.winner).toBeNull();
    expect(derby.onPenalties).toBe(false);
  });

  it("the same squad in both dugouts is a training match (draw, flagged) whatever the order", () => {
    const squad = flatSquad("x", 70);
    const derby = computeDerby(squad, [squad[2], squad[0], squad[1]]);
    expect(derby.training).toBe(true);
    expect(derby.winner).toBeNull();
  });

  it("team rating is the mean overall, and the captain is the best card", () => {
    const home = [
      mkCard("h0", stats(50, 50, 50, 50, 50, 50), 60),
      mkCard("h1", stats(50, 50, 50, 50, 50, 50), 71),
      mkCard("h2", stats(50, 50, 50, 50, 50, 50), 82),
    ];
    const derby = computeDerby(home, flatSquad("a", 50));
    expect(derby.home.rating).toBe(71); // (60+71+82)/3 = 71
    expect(derby.home.captain.login).toBe("h2");
    expect(derby.home.name).toBe("h2 FC");
  });
});

describe("derby scorers", () => {
  it("credits each goal to the squad member who topped that stat", () => {
    const home = [
      mkCard("keeper", stats(10, 10, 10, 10, 99, 10), 70),
      mkCard("striker", stats(10, 99, 10, 10, 10, 10), 70),
      mkCard("filler", stats(10, 10, 10, 10, 10, 10), 70),
    ];
    // Away is weak enough that home takes all six, so every goal has a credit.
    const derby = computeDerby(home, flatSquad("a", 5));
    expect(derby.score).toEqual({ home: 6, away: 0 });
    expect(derby.scorers.find((s) => s.key === "sho")?.login).toBe("striker");
    expect(derby.scorers.find((s) => s.key === "def")?.login).toBe("keeper");
    expect(derby.scorers.every((s) => s.side === "home")).toBe(true);
  });

  it("the goal ticker always climbs", () => {
    const derby = computeDerby(flatSquad("h", 80), flatSquad("a", 20));
    const minutes = derby.scorers.map((s) => s.minute);
    expect(minutes).toHaveLength(6);
    for (let i = 1; i < minutes.length; i++) {
      expect(minutes[i]).toBeGreaterThan(minutes[i - 1]);
    }
  });

  it("a level stat puts no goal on the ticker", () => {
    const derby = computeDerby(flatSquad("h", 50), flatSquad("a", 50));
    expect(derby.scorers).toEqual([]);
  });
});

describe("man of the match", () => {
  it("comes from the winning side, and most goals takes it", () => {
    const home = [
      mkCard("hero", stats(99, 99, 99, 99, 10, 10), 70),
      mkCard("mate", stats(10, 10, 10, 10, 99, 99), 70),
      mkCard("bench", stats(10, 10, 10, 10, 10, 10), 99),
    ];
    const derby = computeDerby(home, flatSquad("a", 20));
    expect(derby.motm?.side).toBe("home");
    expect(derby.motm?.card.login).toBe("hero"); // 4 goals to mate's 2
    expect(derby.motm?.goals).toBe(4);
  });

  it("a losing team's top scorer never takes it", () => {
    const home = [mkCard("h", stats(99, 99, 99, 99, 99, 10), 70)];
    const away = [mkCard("a", stats(10, 10, 10, 10, 10, 99), 70)];
    const derby = computeDerby(home, away);
    expect(derby.winner).toBe("home");
    expect(derby.motm?.card.login).toBe("h");
  });

  it("nobody scored, nobody is man of the match", () => {
    const derby = computeDerby(flatSquad("h", 50), flatSquad("a", 50));
    expect(derby.motm).toBeNull();
  });

  it("a draw opens it to both sides; rating breaks a tie on goals", () => {
    const home = [mkCard("h", stats(90, 90, 90, 10, 10, 10), 75)];
    const away = [mkCard("a", stats(10, 10, 10, 90, 90, 90), 75)];
    const derby = computeDerby(home, away);
    expect(derby.winner).toBeNull();
    expect(derby.motm?.goals).toBe(3); // both scored 3; the tie falls to rating
  });
});

describe("derby receipts", () => {
  const withMetrics = (login: string, solved: number, rating: number, acc: number) =>
    mkCard(login, stats(50, 50, 50, 50, 50, 50), 70, {
      metrics: [
        { label: METRIC_LABELS.totalSolved, value: solved },
        { label: METRIC_LABELS.contestRating, value: rating },
        { label: METRIC_LABELS.acceptance, value: acc },
      ],
    });

  it("adds up counts, takes the best rating, and averages a percentage", () => {
    const home = [
      withMetrics("h0", 100, 1500, 40),
      withMetrics("h1", 200, 2100, 50),
      withMetrics("h2", 300, 1800, 60),
    ];
    const derby = computeDerby(home, flatSquad("a", 50));
    const row = (label: string) =>
      derby.receipts.find((r) => r.label === label)?.home;
    expect(row("Problems solved")).toBe(600); // summed
    expect(row("Best contest rating")).toBe(2100); // the squad's best, never summed
    expect(row("Acceptance %")).toBe(50); // averaged
  });

  it("is the fixed six rows, and a hidden metric reads back as 0", () => {
    const derby = computeDerby(flatSquad("h", 50), flatSquad("a", 50));
    expect(derby.receipts.map((r) => r.label)).toEqual([
      "Problems solved",
      "Hard solved",
      "Best contest rating",
      "Acceptance %",
      "Best streak",
      "Submissions",
    ]);
    expect(derby.receipts.every((r) => r.home === 0)).toBe(true);
  });
});

describe("tallyDerby + derbyDominance", () => {
  it("tallies a progressive subset — the live scoreboard's rule", () => {
    const derby = computeDerby(flatSquad("h", 80), flatSquad("a", 20));
    expect(tallyDerby(derby.rows.slice(0, 2))).toEqual({ home: 2, away: 0 });
    expect(tallyDerby([])).toEqual({ home: 0, away: 0 });
  });

  it("agrees with computeDerby's own scoreline over the full set", () => {
    const home = [mkCard("h", stats(90, 90, 90, 10, 10, 10), 70)];
    const away = [mkCard("a", stats(10, 10, 10, 90, 90, 90), 80)];
    const derby = computeDerby(home, away);
    expect(tallyDerby(derby.rows)).toEqual(derby.score);
  });

  it("inherits the Duel's curve: even is 50, total domination is 100", () => {
    expect(derbyDominance([])).toBe(50);
    expect(derbyDominance(computeDerby(flatSquad("h", 70), flatSquad("a", 70)).rows)).toBe(50);
    expect(derbyDominance(computeDerby(flatSquad("h", 99), flatSquad("a", 10)).rows)).toBe(100);
    expect(derbyDominance(computeDerby(flatSquad("h", 10), flatSquad("a", 99)).rows)).toBe(0);
  });

  it("can never sit on the wrong side of the scoreline", () => {
    // Home wins one stat by a mile and loses the other five narrowly.
    const home = [mkCard("h", stats(99, 60, 60, 60, 60, 60), 70)];
    const away = [mkCard("a", stats(10, 64, 64, 64, 64, 64), 70)];
    const derby = computeDerby(home, away);
    expect(derby.score).toEqual({ home: 1, away: 5 });
    expect(derbyDominance(derby.rows)).toBeLessThan(50);
  });
});

describe("pitchOrder", () => {
  it("drops the Anchor in and pushes the Forward up", () => {
    const squad = [
      mkCard("fwd", stats(50, 50, 50, 50, 50, 50), 70, { family: "Forward" }),
      mkCard("anc", stats(50, 50, 50, 50, 50, 50), 70, { family: "Anchor" }),
      mkCard("pmk", stats(50, 50, 50, 50, 50, 50), 70, { family: "Playmaker" }),
    ];
    expect(pitchOrder(squad).map((c) => c.login)).toEqual(["anc", "pmk", "fwd"]);
  });

  it("settles a same-family argument with DEF, then the login", () => {
    const squad = [
      mkCard("b", stats(50, 50, 50, 50, 40, 50), 70, { family: "Forward" }),
      mkCard("a", stats(50, 50, 50, 50, 80, 50), 70, { family: "Forward" }),
      mkCard("c", stats(50, 50, 50, 50, 40, 50), 70, { family: "Forward" }),
    ];
    expect(pitchOrder(squad).map((c) => c.login)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the squad it was handed", () => {
    const squad = [
      mkCard("fwd", stats(50, 50, 50, 50, 50, 50), 70, { family: "Forward" }),
      mkCard("anc", stats(50, 50, 50, 50, 50, 50), 70, { family: "Anchor" }),
    ];
    pitchOrder(squad);
    expect(squad.map((c) => c.login)).toEqual(["fwd", "anc"]);
  });
});

describe("slotsFor", () => {
  it("gives three the triangle: one in, two up", () => {
    const slots = slotsFor(3);
    expect(slots).toHaveLength(3);
    expect(slots[0].x).toBeLessThan(slots[1].x); // the deep one sits behind
    expect(slots[1].y).not.toBe(slots[2].y); // the forwards split
  });

  it("sits the squad tight around the centre line — at rest it reads as one unit", () => {
    for (const size of [1, 2, 3]) {
      const slots = slotsFor(size);
      // The forwards mirror each other about y = 50, so the shape is centred
      // rather than drifting to one touchline.
      const mean = slots.reduce((t, s) => t + s.y, 0) / slots.length;
      expect(mean).toBe(50);
      // And they stay near it: no player stranded out by the corner flags.
      for (const s of slots) expect(Math.abs(s.y - 50)).toBeLessThanOrEqual(15);
    }
  });

  it("every slot sits inside its own half, so the two teams can never overlap", () => {
    for (const size of [1, 2, 3]) {
      for (const s of slotsFor(size)) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(50); // mirrored to 100-x, away stays clear
        expect(s.y).toBeGreaterThan(0);
        expect(s.y).toBeLessThan(100);
      }
    }
  });

  it("clamps out-of-range sizes instead of drawing a broken pitch", () => {
    expect(slotsFor(0)).toEqual(slotsFor(1));
    expect(slotsFor(9)).toEqual(slotsFor(3));
  });
});

describe("derby kits", () => {
  const captain = (finish: Card["finish"]) =>
    mkCard("c", stats(50, 50, 50, 50, 50, 50), 70, { finish });

  it("keeps both tier kits when they already contrast", () => {
    const { home, away, changed } = derbyKits(captain("gold"), captain("toty"));
    expect(changed).toBe(false);
    expect(home.ink).not.toBe(away.ink);
  });

  it("changes the AWAY strip when the kits clash — home always keeps its colors", () => {
    const homeKit = derbyKits(captain("gold"), captain("gold"));
    expect(homeKit.changed).toBe(true);
    expect(homeKit.home.ink).toBe("#F3D679"); // home is untouched
    expect(homeKit.away.ink).toBe("#5ad1e5");
  });

  it("catches the near-twin tiers the eye can't separate", () => {
    expect(kitsClash("#F3D679", "#F3D688")).toBe(true); // gold vs icon
    expect(kitsClash("#D6DCE6", "#CADBFF")).toBe(true); // silver vs toty
    expect(kitsClash("#F0CFA8", "#F3D679")).toBe(true); // bronze vs gold
  });

  it("leaves genuinely different kits alone", () => {
    expect(kitsClash("#CADBFF", "#F0CFA8")).toBe(false); // toty vs bronze
    expect(kitsClash("#ff6273", "#F3D679")).toBe(false); // founder vs gold
  });

  it("whatever happens, the two sides never wear the same ink", () => {
    const finishes: Card["finish"][] = ["bronze", "silver", "gold", "totw", "toty", "icon", "founder"];
    for (const h of finishes) {
      for (const a of finishes) {
        const { home, away } = derbyKits(captain(h), captain(a));
        expect(kitsClash(home.ink, away.ink)).toBe(false);
      }
    }
  });
});

describe("derby broadcast sequence", () => {
  it("kicks off, resolves all six rows in order, stamps, then settles", () => {
    const steps = derbySequenceFor(false);
    expect(steps[0].phase).toEqual({ kind: "walkout" });
    expect(
      steps.filter((s) => s.phase.kind === "row").map((s) => (s.phase.kind === "row" ? s.phase.row : -1)),
    ).toEqual([0, 1, 2, 3, 4, 5]);
    expect(steps[steps.length - 2].phase).toEqual({ kind: "result" });
    expect(steps[steps.length - 1].phase).toEqual({ kind: "settled" });
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].at).toBeGreaterThan(steps[i - 1].at);
    }
  });

  it("gives the ball longer to travel than the Duel gives a bar", () => {
    const gap = (steps: { at: number }[]) => steps[2].at - steps[1].at;
    expect(gap(derbySequenceFor(false))).toBeGreaterThan(480);
  });

  it("reduced motion collapses straight to settled at 0ms", () => {
    expect(derbySequenceFor(true)).toEqual([{ phase: { kind: "settled" }, at: 0 }]);
  });
});
