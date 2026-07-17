import type { Metadata } from "next";
import ContentPage from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Privacy Policy — LeetFut",
  description:
    "How LeetFut handles data: it reads only public LeetCode profile data, stores no accounts or passwords, and uses privacy-friendly analytics for aggregate usage.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <ContentPage kicker="LEGAL" title="Privacy Policy" updated="July 2026">
      <p>
        LeetFut is built to be data-light. You never create an account and we never ask for a password. This page
        explains what is and isn&apos;t collected.
      </p>

      <h2>What we read</h2>
      <p>
        When you scout a username, LeetFut fetches that account&apos;s <strong>public LeetCode profile data</strong> —
        solved counts, acceptance rate, contest rating, submission calendar, topics, languages and badges — and turns it
        into a card. This is the same information anyone can see on the public profile.
      </p>

      <h2>What we don&apos;t collect</h2>
      <ul>
        <li>No sign-up, no passwords, no LeetCode credentials.</li>
        <li>No private or non-public account data.</li>
        <li>No selling or sharing of personal data with advertisers.</li>
      </ul>

      <h2>Analytics</h2>
      <p>
        We use privacy-friendly, aggregate analytics (such as Vercel Analytics and optionally Google Analytics) to
        understand overall traffic — page views, rough location and device type. These are used in aggregate to improve
        the site and are not used to identify individuals.
      </p>

      <h2>Third-party services</h2>
      <ul>
        <li><strong>LeetCode</strong> — public profile data is fetched to build cards.</li>
        <li><strong>GitHub</strong> — avatars and the repository star count are loaded from GitHub.</li>
        <li><strong>Analytics providers</strong> — as described above.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        LeetFut itself does not use tracking cookies for advertising. Analytics providers may set their own cookies or
        local storage for aggregate measurement.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Reach out via the <a href="/contact">contact page</a>. We may update this policy from
        time to time; the date above reflects the latest revision.
      </p>
    </ContentPage>
  );
}
