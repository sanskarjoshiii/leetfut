import { calendarStats, type RawPayload } from "./client";
import { isHeadlineLanguage } from "../languages";
import type { Signals } from "@/lib/scoring/types";

// Maps the (already real, already flattened) LeetCode payload onto the scoring
// signals. No estimation — every field traces back to a LeetCode number.
export function signalsFromPayload(p: RawPayload): Signals {
  const { activeDays, streak, activeYears, recentSolved } = calendarStats(p.submissionCalendar);

  // Languages ranked by problems solved (desc), programming languages floated
  // above styling/markup so the card headlines a real language.
  const sorted = [...p.languages].sort((a, b) => b.solved - a.solved || a.language.localeCompare(b.language));
  const rankedLanguages = [
    ...sorted.filter((l) => isHeadlineLanguage(l.language)),
    ...sorted.filter((l) => !isHeadlineLanguage(l.language)),
  ].map((l) => l.language);
  const languages = p.languages.filter((l) => l.solved > 0).length;

  // A recent burst well above the usual pace: this year's submissions clearly
  // outpacing the per-year average across the whole (calendar-visible) history.
  const avgPerYear = p.totalSubmissions / Math.max(activeYears, 1);
  const recent_spike = recentSolved > 200 && recentSolved > 1.8 * avgPerYear;

  return {
    login: p.username,
    name: p.name || p.username,
    avatarUrl: p.avatar || "",
    country: p.country,

    total_solved: p.totalSolved,
    easy_solved: p.easySolved,
    medium_solved: p.mediumSolved,
    hard_solved: p.hardSolved,
    acceptance_rate: p.acceptanceRate,
    total_submissions: p.totalSubmissions,

    contest_rating: p.contestRating,
    contest_attended: p.contestAttended,
    contest_global_rank: p.contestGlobalRanking,
    contest_top_percent: p.contestTopPercentage || (p.contestRating > 0 ? 0 : 100),

    ranking: p.ranking,
    reputation: p.reputation,
    badges: p.badges,

    streak,
    active_days: activeDays,
    active_years: activeYears,
    recent_solved: recentSolved,
    recent_spike,

    topics: p.topics,
    languages,
    rankedLanguages,
    topLanguage: rankedLanguages[0] ?? null,
  };
}
