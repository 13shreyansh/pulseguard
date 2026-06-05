import { NextResponse } from "next/server";
import { issueDispatchSession } from "@/lib/dispatch-session";

export async function POST() {
  return NextResponse.json({
    token: issueDispatchSession(),
    expiresInSeconds: 600,
  });
}
