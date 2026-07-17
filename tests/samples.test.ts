import { describe, expect, it } from "vitest";
import { SAMPLE_CARDS } from "@/lib/leetcode/samples";

// Locks the showcase invariants: pinned origin countries, and the language logo
// matching the headline language (no fall-through to a different icon; a top
// language Devicon lacks gets no logo while its name still shows).
describe("showcase samples", () => {
  const by = Object.fromEntries(SAMPLE_CARDS.map((c) => [c.login, c]));

  it("builds a card for each showcased login", () => {
    expect(Object.keys(by).sort()).toEqual(["lee215", "skywalkert", "votrubac", "zanj0"]);
  });

  it("resolves origin countries (pinned for lee215/votrubac, profile-derived otherwise)", () => {
    expect(by["lee215"].country).toBe("us");
    expect(by["zanj0"].country).toBe("us");
    expect(by["votrubac"].country).toBe("us");
    expect(by["skywalkert"].country).toBe("cn");
  });

  it("language logo matches the top language (Devicon), never a mismatch", () => {
    // C++ is in the catalog, so the C++ logo — never a different language's icon.
    expect(by["zanj0"].topLanguage).toBe("C++");
    expect(by["zanj0"].languageLogo).toEqual({ name: "C++", slug: "cplusplus-original" });
    expect(by["votrubac"].languageLogo).toEqual({ name: "C++", slug: "cplusplus-original" });
    expect(by["skywalkert"].languageLogo).toEqual({ name: "C++", slug: "cplusplus-original" });
  });

  it("shows the top language name even when Devicon has no logo for it", () => {
    // lee215's #1 is Python3 — no catalog logo, so the name still shows but the
    // logo is null rather than falling through to a different language's icon.
    expect(by["lee215"].topLanguage).toBe("Python3");
    expect(by["lee215"].languageLogo).toBeNull();
  });
});
