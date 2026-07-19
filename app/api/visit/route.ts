import { getScoutCount, getVisitorHistory, recordVisitor } from "@/lib/analytics";

// Live home-stats endpoint.
//   POST { vid }  -> registers this browser as a visitor (counted once, ever)
//                    and returns the current numbers.
//   GET           -> just returns the current numbers (polled for live updates).
// `cards` is the distinct-profile count ("cards rated"); `visitors` is the
// unique-visitor sparkline whose last point is the "users scouted" total.
export const dynamic = "force-dynamic";

async function stats() {
  const [visitors, cards] = await Promise.all([getVisitorHistory(30), getScoutCount()]);
  return Response.json({ visitors, cards });
}

export async function POST(req: Request) {
  let vid = "";
  try {
    const body = await req.json();
    if (body && typeof body.vid === "string") vid = body.vid;
  } catch {}
  await recordVisitor(vid);
  return stats();
}

export async function GET() {
  return stats();
}
