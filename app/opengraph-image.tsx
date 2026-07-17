import { ImageResponse } from "next/og";
import { SAMPLE_CARDS } from "@/lib/leetcode/samples";
import { loadCardAssets, cardTree } from "@/lib/og/renderCard";

// Branded preview for the home page / bare leetfut.com links. Next wires this as
// the default og:image + twitter:image automatically (metadataBase is absolute).
export const runtime = "nodejs";
export const alt = "LeetFut — your LeetCode, rated out of 99";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A real card (neal_wu, a baked sample) as the hero instead of a
// placeholder chip — same renderer as /<user>.png and the unfurls.
const CARD_W = 316; // -> ~480 tall, fits the 630 frame with margin

export default async function Image() {
  const card = SAMPLE_CARDS.find((c) => c.login === "neal_wu") ?? SAMPLE_CARDS[0];
  const assets = await loadCardAssets(card, CARD_W);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0c0b0a",
          backgroundImage:
            "radial-gradient(900px 520px at 22% -12%, rgba(255,161,22,0.20), transparent 60%), radial-gradient(720px 520px at 105% 120%, rgba(212,175,55,0.14), transparent 60%)",
          color: "#f5f5f4",
          fontFamily: "DINPro",
          padding: 72,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", paddingRight: 48 }}>
          <div style={{ display: "flex", color: "#ffa116", fontSize: 24, fontWeight: 700, letterSpacing: 3 }}>
            LEETCODE × WORLD CUP 26
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto" }}>
            <div style={{ display: "flex", fontSize: 108, fontWeight: 800, lineHeight: 0.95 }}>GET</div>
            <div style={{ display: "flex", fontSize: 108, fontWeight: 800, lineHeight: 0.95 }}>
              <span>SCOUTED</span>
              <span style={{ color: "#ffa116" }}>.</span>
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#a8a29e", marginTop: 26, maxWidth: 600, lineHeight: 1.3 }}>
              Turn any LeetCode profile into a World-Cup-style player card, rated out of 99.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#6b6660" }}>leetfut.com</div>
        </div>

        {/* the real card as the hero (Torvalds sample), same renderer as the embeds */}
        <div style={{ display: "flex" }}>{cardTree(card, assets, CARD_W)}</div>
      </div>
    ),
    { ...size, fonts: assets.fonts },
  );
}
