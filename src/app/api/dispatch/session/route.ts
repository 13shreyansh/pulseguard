import { NextRequest, NextResponse } from "next/server";
import { dispatchSecretReady, getClientKey, issueDispatchSession } from "@/lib/dispatch-session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { name: "dispatch-session", limit: 6, windowMs: 60_000 });
  if (limited) return limited;

  if (!dispatchSecretReady()) {
    return NextResponse.json({ error: "Dispatch session signing is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { report?: string } | null;
  const report = body?.report?.trim();
  if (!report || report.length < 12) {
    return NextResponse.json({ error: "Reviewed report is required before dispatch." }, { status: 400 });
  }

  const token = issueDispatchSession({ clientKey: getClientKey(request), report });
  if (!token) {
    return NextResponse.json({ error: "Dispatch session signing is not configured." }, { status: 500 });
  }

  return NextResponse.json({
    token,
    expiresInSeconds: 600,
  });
}
