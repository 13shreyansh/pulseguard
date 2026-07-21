import { NextRequest, NextResponse } from "next/server";
import {
  dispatchSecretReady,
  getClientKey,
  isSameOrigin,
  issueDispatchSession,
  validDemoAccessCode,
} from "@/lib/dispatch-session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { name: "dispatch-session", limit: 6, windowMs: 60_000 });
  if (limited) return limited;

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request must come from Pulse." }, { status: 403 });
  }

  if (!dispatchSecretReady()) {
    return NextResponse.json({ error: "Dispatch session signing is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
    report?: string;
    location?: string;
    incidentId?: string;
    accessCode?: string;
  } | null;
  const report = body?.report?.trim();
  const location = body?.location?.trim();
  const incidentId = body?.incidentId?.trim();
  if (!report || report.length < 12 || report.length > 2_000) {
    return NextResponse.json({ error: "A reviewed report between 12 and 2,000 characters is required." }, { status: 400 });
  }
  if (!location || location.length < 3 || location.length > 200) {
    return NextResponse.json({ error: "A reviewed location is required before dispatch." }, { status: 400 });
  }
  if (!incidentId || !/^[a-zA-Z0-9_-]{12,80}$/.test(incidentId)) {
    return NextResponse.json({ error: "The incident session is invalid. Start a new report." }, { status: 400 });
  }
  if (!validDemoAccessCode(body?.accessCode)) {
    return NextResponse.json({ error: "Enter the private judge demo code to contact the controlled desk." }, { status: 403 });
  }

  const token = issueDispatchSession({ clientKey: getClientKey(request), report, location, incidentId });
  if (!token) {
    return NextResponse.json({ error: "Dispatch session signing is not configured." }, { status: 500 });
  }

  return NextResponse.json(
    { token, expiresInSeconds: 600 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
