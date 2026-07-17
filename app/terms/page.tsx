import type { Metadata } from "next";
import ContentPage from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Terms & Conditions — LeetFut",
  description:
    "The terms of use for LeetFut — an independent, open-source fan project that rates public LeetCode profiles as player cards. Provided as-is, not affiliated with LeetCode.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <ContentPage kicker="LEGAL" title="Terms & Conditions" updated="July 2026">
      <p>
        By using LeetFut you agree to these terms. LeetFut is a free, open-source fan project offered for entertainment
        and informational purposes.
      </p>

      <h2>Not affiliated with LeetCode</h2>
      <p>
        LeetFut is <strong>not affiliated with, endorsed by, or connected to LeetCode</strong>. &quot;LeetCode&quot; and
        related marks belong to their respective owners. LeetFut simply reads publicly available profile data.
      </p>

      <h2>Ratings are for fun</h2>
      <p>
        Cards, stats, positions and finishes are a playful interpretation of public data. They are not an official
        assessment of skill, employability or ability, and should not be treated as one.
      </p>

      <h2>Provided &quot;as is&quot;</h2>
      <p>
        The service is provided &quot;as is&quot; without warranties of any kind. Data may be incomplete, delayed or
        inaccurate — for example if an upstream API is rate-limited or a profile is private. We are not liable for any
        loss arising from use of the site.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t use the service to harass, defame or target individuals.</li>
        <li>Don&apos;t attempt to overload, scrape at scale, or disrupt the service.</li>
        <li>Don&apos;t misrepresent LeetFut as an official LeetCode product.</li>
      </ul>

      <h2>Open source</h2>
      <p>
        LeetFut&apos;s source is available on{" "}
        <a href="https://github.com/sanskarjoshiii/leetfut" target="_blank" rel="noopener">GitHub</a> under the MIT
        License. Your use of the code is governed by that license.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms over time. Continued use of the site after changes constitutes acceptance. Questions?
        See the <a href="/contact">contact page</a>.
      </p>
    </ContentPage>
  );
}
