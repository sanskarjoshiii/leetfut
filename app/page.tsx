import Background from "@/components/Background";
import AppShell from "@/components/AppShell";
import { getRepoStars } from "@/lib/repoStars";
import { getScoutCount, getVisitorHistory } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";

// ISR: the shell is served straight from the CDN and re-rendered at most once a
// minute, so first paint never waits on a serverless cold start. The scout
// count/graph tolerate being up to 60s stale (the stars fetch keeps its own 1h
// cache regardless).
export const revalidate = 60;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "LeetFut",
      description: "Turn any LeetCode profile into a player card rated out of 99.",
    },
    {
      "@type": "WebApplication",
      name: "LeetFut",
      url: SITE_URL,
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
  // scoutCount -> "cards rated" (distinct profiles); visitor history -> the
  // "users scouted" sparkline (unique browsers). Both refresh live client-side.
  const [stars, scoutCount, scoutHistory] = await Promise.all([
    getRepoStars(),
    getScoutCount(),
    getVisitorHistory(),
  ]);
  return (
    <div className="relative min-h-screen overflow-x-hidden text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Background />
      <AppShell stars={stars} scoutCount={scoutCount} scoutHistory={scoutHistory} />
    </div>
  );
}
