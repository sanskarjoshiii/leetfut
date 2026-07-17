import Background from "@/components/Background";
import AppShell from "@/components/AppShell";
import { getRepoStars } from "@/lib/repoStars";
import { getScoutCount, getScoutHistory } from "@/lib/analytics";

// Dynamic so the live scout count is fresh per load (the stars fetch keeps its
// own 1h cache regardless).
export const dynamic = "force-dynamic";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://leetfut.com/#website",
      url: "https://leetfut.com",
      name: "LeetFut",
      description: "Turn any LeetCode profile into a player card rated out of 99.",
    },
    {
      "@type": "WebApplication",
      name: "LeetFut",
      url: "https://leetfut.com",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      description:
        "Turn any LeetCode profile into a FIFA-Ultimate-Team-style player card rated out of 99, built from real LeetCode stats.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export default async function Home() {
  const [stars, scoutCount, scoutHistory] = await Promise.all([
    getRepoStars(),
    getScoutCount(),
    getScoutHistory(),
  ]);
  return (
    <div className="relative min-h-screen overflow-x-hidden text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Background />
      <AppShell stars={stars} scoutCount={scoutCount} scoutHistory={scoutHistory} />
    </div>
  );
}
