// Loading-screen line bank — football × LeetCode. Pure data + a deterministic
// rotation helper so the loading screen stays lively without randomness.
export const PUNS: readonly string[] = [
  "Counting problems solved (career goals)…",
  "Scouting the Hard tier (your best finishes)…",
  "Reading your acceptance rate (shot accuracy)…",
  "Checking your contest rating (big-match form)…",
  "Timing your streak (games unbeaten)…",
  "Mapping your topics (every position covered)…",
  "Weighing your submissions (minutes on the pitch)…",
  "Tallying your badges (the trophy cabinet)…",
  "Clocking your active days (training ground hours)…",
  "Gauging your Easy/Medium/Hard split (the scoreline)…",
  "Ranking your languages (your strongest foot)…",
  "Reviewing the tape (your submission history)…",
];

// Stable line for a given tick — callers advance `tick` on an interval.
export function punAt(tick: number): string {
  return PUNS[((tick % PUNS.length) + PUNS.length) % PUNS.length];
}
