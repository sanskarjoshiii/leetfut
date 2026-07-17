import type { Metadata } from "next";
import DerbyView from "@/components/DerbyView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Derby — LeetFut",
  description:
    "3-a-side: pick two squads of up to three LeetCode profiles and settle it on the pitch. Six stats, six chances, one scoreline.",
  robots: { index: false },
};

const squad = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export default async function DerbyPage({
  searchParams,
}: {
  searchParams: Promise<{ home?: string; away?: string }>;
}) {
  const sp = await searchParams;
  return <DerbyView home={squad(sp.home)} away={squad(sp.away)} />;
}
