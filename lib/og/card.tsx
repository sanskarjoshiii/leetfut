import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Loads the DINPro suite for next/og (Satori) text — used by the embed "visit to
// generate" hint image. The actual cards are rendered client-side (html-to-image)
// and stored in Blob, so there's no Satori card re-creation here anymore.
export async function loadCardFonts() {
  const f = (name: string) => readFile(join(process.cwd(), "app", "fonts", name));
  const [cond, medium, bold] = await Promise.all([
    f("DINPro-Cond.otf"),
    f("DINPro-CondMedium.otf"),
    f("DINPro-CondBold.otf"),
  ]);
  return [
    { name: "DINPro", data: cond, weight: 400 as const, style: "normal" as const },
    { name: "DINPro", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "DINPro", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}
