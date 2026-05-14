import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get("callId");

  if (!callId) {
    return NextResponse.json({ error: "callId is required" }, { status: 400 });
  }

  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Vapi API key is not configured" }, { status: 500 });
  }

  const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Vapi status failed", details: errorText.slice(0, 300) },
      { status: 502 },
    );
  }

  const call = (await response.json()) as {
    id?: string;
    status?: string;
    endedReason?: string;
    transcript?: string;
    summary?: string;
  };

  return NextResponse.json({
    id: call.id,
    status: call.status,
    endedReason: call.endedReason,
    transcript: call.transcript,
    summary: call.summary,
  });
}
