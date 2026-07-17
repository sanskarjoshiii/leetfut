import type { Metadata } from "next";
import ContentPage from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "About — LeetFut",
  description:
    "LeetFut turns any public LeetCode profile into a FIFA-Ultimate-Team-style player card rated out of 99, scored live from real problems solved, contest rating, streaks and badges.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ContentPage kicker="ABOUT" title="What is LeetFut?">
      <p>
        <strong>LeetFut</strong> turns any public LeetCode profile into a World-Cup / FIFA-Ultimate-Team-style{" "}
        <strong>player card rated out of 99</strong>. Type a username, and it scouts the profile, reads six real
        signals, and prints a card with a position, an archetype and a finish — from Bronze all the way to Icon.
      </p>
      <p>
        There are no surveys and nothing to fill in. Every number on your card traces back to a real LeetCode
        statistic. It&apos;s a fun, shareable way to see your problem-solving at a glance and stack it up against friends.
      </p>

      <h2>How the scouting works</h2>
      <p>Six signals from your public profile, each mapped to a football stat:</p>
      <ul>
        <li><strong>Consistency (CNS)</strong> — your streak and active days</li>
        <li><strong>Hard mastery (HRD)</strong> — hard problems solved</li>
        <li><strong>Contest (CTS)</strong> — your contest rating</li>
        <li><strong>Versatility (VER)</strong> — topics and languages covered</li>
        <li><strong>Accuracy (ACC)</strong> — your acceptance rate</li>
        <li><strong>Volume (VOL)</strong> — total solved and years active</li>
      </ul>
      <p>
        Your <strong>overall</strong> is a position-weighted blend, not a flat average. Raw stats cap at 88 — the top
        slice is a legacy gate earned with years, contest standing, a deep back-catalogue and earned badges, so one big
        year won&apos;t crown you an Icon.
      </p>

      <h2>Duel &amp; League</h2>
      <p>
        Beyond a single card, you can <strong>Duel a rival</strong> head-to-head across the six stats, or run a{" "}
        <strong>League</strong> to rank yourself and up to four teammates into a 1st / 2nd / 3rd table.
      </p>

      <h2>Built with</h2>
      <p>
        Next.js, TypeScript and Tailwind CSS. LeetFut is open source and was inspired by{" "}
        <a href="https://gitfut.com" target="_blank" rel="noopener">gitfut</a>. It is a fan project and is{" "}
        <strong>not affiliated with, endorsed by, or connected to LeetCode</strong>.
      </p>
      <p>
        Questions or ideas? Head to the <a href="/contact">contact page</a> or read the <a href="/faq">FAQ</a>.
      </p>
    </ContentPage>
  );
}
