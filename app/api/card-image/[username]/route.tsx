import { ImageResponse } from "next/og";
import { scoutCard } from "@/lib/scout";
import { pickFlag } from "@/lib/flagPriority";
import { renderCardImage } from "@/lib/og/renderCard";
import { loadCardFonts } from "@/lib/og/card";

export const runtime = "nodejs";

const W = 810;
const H = 1230;

// Embeddable card image: leetfut.com/<user>.png (via the next.config rewrite) -> here.
// The card is rendered on demand to match the in-app PlayerCard (lib/og/renderCard)
// and cached hard at the CDN, so there's no object store to keep in sync or pay for.
// A failed scout (no such user) or a render error falls back to a small branded hint.
export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  // Let embeds pin a flag: leetfut.com/<user>.png?country=fr (the .png rewrite keeps
  // the query). A valid override wins, else the LeetCode-derived flag — same priority
  // as the page and JSON API.
  const override = new URL(req.url).searchParams.get("country");
  try {
    const card = await scoutCard(username);
    return await renderCardImage({ ...card, country: pickFlag(override, card.country) ?? "" });
  } catch {
    return fallback(username);
  }
}

async function fallback(username: string) {
  const fonts = await loadCardFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0b0a",
          backgroundImage: "radial-gradient(60% 40% at 50% 32%, rgba(255,161,22,0.16), transparent 72%)",
          color: "#f5f5f4",
          fontFamily: "DINPro",
          padding: 64,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", color: "#ffa116", fontSize: 34, fontWeight: 700, letterSpacing: 6 }}>LEETFUT</div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, marginTop: 24 }}>@{username}</div>
        <div style={{ display: "flex", fontSize: 30, color: "#a8a29e", marginTop: 22 }}>scout this profile at</div>
        <div style={{ display: "flex", marginTop: 10, fontSize: 32, color: "#ffa116", fontWeight: 700 }}>leetfut.com</div>
      </div>
    ),
    { width: W, height: H, fonts, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
