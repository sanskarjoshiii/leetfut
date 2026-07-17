import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, JetBrains_Mono, EB_Garamond } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";

// Umami Cloud (visitors + country/region breakdown, viewed on the Umami
// dashboard). Only injected when a website ID is configured, so forks and local
// dev send nothing.
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

// Display — ultra-condensed all-caps for the WC26 "tournament" impact.
const display = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
});

// UI / body — clean and legible at small sizes.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// The "@handle" / dev signal.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

// Hero display — the "Aldo the Apache" local face for the "GET SCOUTED" title,
// with a classic book serif for the tagline beneath it.
const fantasy = localFont({
  src: "./fonts/AldotheApache.ttf",
  variable: "--font-aldo",
  display: "swap",
});
const serif = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
});

// FUT card fonts (DINPro suite) ported from the Python generator — used by the
// player card overlays.
const dinCond = localFont({ src: "./fonts/DINPro-Cond.otf", variable: "--font-din-cond", display: "swap" });
const dinBold = localFont({ src: "./fonts/DINPro-CondBold.otf", variable: "--font-din-bold", display: "swap" });
const dinMedium = localFont({ src: "./fonts/DINPro-CondMedium.otf", variable: "--font-din-medium", display: "swap" });

const TITLE = "LeetFut — your LeetCode, rated out of 99";
const DESCRIPTION =
  "Rate any LeetCode profile out of 99 as a FIFA-Ultimate-Team-style player card, scored from real problems solved, contest rating and streaks. Get scouted and share your card.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://leetfut.com"),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "LeetCode profile card",
    "rate my LeetCode",
    "LeetCode stats",
    "developer trading card",
    "FUT card",
    "LeetCode rating",
    "World Cup",
    "LeetFut",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://leetfut.com",
    siteName: "LeetFut",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0b0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${fantasy.variable} ${serif.variable} ${dinCond.variable} ${dinBold.variable} ${dinMedium.variable} antialiased`}
    >
      <body>
        {children}
        <Analytics />
        {UMAMI_WEBSITE_ID && (
          <Script
            src="https://cloud.umami.is/script.js"
            data-website-id={UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
