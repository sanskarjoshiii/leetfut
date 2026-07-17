import type { Metadata } from "next";
import LeagueView from "@/components/LeagueView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The League — LeetFut",
  description: "Rank your crew: up to six LeetCode profiles, scouted live and sorted into a 1st / 2nd / 3rd table.",
  robots: { index: false },
};

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ players?: string }>;
}) {
  const sp = await searchParams;
  const players = (sp.players ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return <LeagueView players={players} />;
}
