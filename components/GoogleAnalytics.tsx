import Script from "next/script";

// Google Analytics 4 (Phase 13). Dormant until you set NEXT_PUBLIC_GA_ID to your
// Measurement ID (looks like "G-XXXXXXXXXX") in .env.local — then it loads gtag
// and starts reporting. Renders nothing when unset, so it's zero-cost by default.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
