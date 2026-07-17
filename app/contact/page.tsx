import type { Metadata } from "next";
import ContentPage from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Contact — LeetFut",
  description:
    "Get in touch with the LeetFut team — report a bug, request a feature, or say hi. Reach us through GitHub issues and the makers' profiles.",
  alternates: { canonical: "/contact" },
};

const MAKERS = ["sanskarjoshiii", "akkki007", "kamranp03"];

export default function ContactPage() {
  return (
    <ContentPage kicker="CONTACT" title="Get in touch">
      <p>
        Got a bug, a feature idea, or just want to say hi? The best way to reach us is through GitHub — it keeps
        everything in one place and public so others benefit too.
      </p>

      <h2>Report a bug or request a feature</h2>
      <p>
        Open an issue on the repository:{" "}
        <a href="https://github.com/sanskarjoshiii/leetfut/issues" target="_blank" rel="noopener">
          github.com/sanskarjoshiii/leetfut/issues
        </a>
        . Include your username, what you expected, and what happened — screenshots help.
      </p>

      <h2>The makers</h2>
      <p>You can also reach the people who built LeetFut directly on GitHub:</p>
      <ul>
        {MAKERS.map((m) => (
          <li key={m}>
            <a href={`https://github.com/${m}`} target="_blank" rel="noopener">
              @{m}
            </a>
          </li>
        ))}
      </ul>

      <h2>Star the project</h2>
      <p>
        If LeetFut made you smile, a star on{" "}
        <a href="https://github.com/sanskarjoshiii/leetfut" target="_blank" rel="noopener">GitHub</a> genuinely helps it
        reach more people. Thank you.
      </p>
    </ContentPage>
  );
}
