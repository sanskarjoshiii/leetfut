import type { Metadata } from "next";
import ContentPage from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "FAQ — LeetFut",
  description:
    "Frequently asked questions about LeetFut: how ratings are calculated, whether it's affiliated with LeetCode, what data is used, how to embed your card, and more.",
  alternates: { canonical: "/faq" },
};

// Q/A pairs — also emitted as FAQPage structured data for rich results.
const FAQS: { q: string; a: string }[] = [
  {
    q: "What is LeetFut?",
    a: "LeetFut turns any public LeetCode profile into a FIFA-Ultimate-Team-style player card rated out of 99, scored live from real problems solved, contest rating, streaks, accuracy, breadth and badges.",
  },
  {
    q: "Is LeetFut affiliated with LeetCode?",
    a: "No. LeetFut is an independent fan project and is not affiliated with, endorsed by, or connected to LeetCode. It only reads publicly available profile data.",
  },
  {
    q: "How is my rating calculated?",
    a: "Six signals from your public profile (consistency, hard mastery, contest, versatility, accuracy and volume) are mapped to football stats. Your overall is a position-weighted blend of those stats capped at 88; the 90s are a legacy gate earned with years active, contest standing, total and hard solves and badges.",
  },
  {
    q: "Do I need an account or password?",
    a: "No. You never log in and LeetFut never asks for a password. You just enter a public LeetCode username.",
  },
  {
    q: "What data does LeetFut use?",
    a: "Only public LeetCode profile data — solved counts, acceptance rate, contest rating, submission calendar, topics, languages and badges. No private data is accessed or stored.",
  },
  {
    q: "How do I embed my card?",
    a: "Your card is available as a live image at your-domain/<username>.png. Drop that image link into a GitHub README, portfolio or profile and it re-scouts itself as your stats change.",
  },
  {
    q: "What is a Duel and a League?",
    a: "A Duel is a 1-v-1 head-to-head between two cards across the six stats. A League ranks you plus up to four teammates into a 1st / 2nd / 3rd standings table.",
  },
  {
    q: "Why is my score lower or higher than I expected?",
    a: "Each stat is measured against the rest of your own profile, so your card leans toward your strengths. High overalls need sustained, broad activity — not one metric — so a spike in a single area won't max the card on its own.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <ContentPage kicker="FAQ" title="Frequently asked questions">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      {FAQS.map((f) => (
        <div key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}
      <p style={{ marginTop: 26 }}>
        Still stuck? Try the <a href="/about">about page</a> or <a href="/contact">get in touch</a>.
      </p>
    </ContentPage>
  );
}
