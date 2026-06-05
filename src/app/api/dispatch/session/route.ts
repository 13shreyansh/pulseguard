import { NextRequest, NextResponse } from "next/server";
import { getClientKey, issueDispatchSession } from "@/lib/dispatch-session";

export async function POST(request: NextRequest) {
  const clientKey = getClientKey(request);
  return NextResponse.json({
    token: issueDispatchSession(clientKey),
    expiresInSeconds: 600,
  });
}
