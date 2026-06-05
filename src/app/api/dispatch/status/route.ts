import { NextRequest, NextResponse } from "next/server";
import { facilityResponsesFromEvidence, inferHandoffStatus, isFailedCallEndReason } from "@/lib/handoff";

function getTwilioAuth() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const username = process.env.TWILIO_API_KEY_SID || accountSid;
  const password = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !username || !password) return null;

  return {
    accountSid,
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  };
}

function publicEvidenceLabel(handoffStatus: string) {
  if (handoffStatus === "accepted") return "The receiver clearly said they can receive the person.";
  if (handoffStatus === "not_confirmed") return "The call did not produce a clear yes.";
  if (handoffStatus === "failed") return "The call did not complete.";
  return undefined;
}

export async function GET(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get("callId");

  if (!callId) {
    return NextResponse.json({ error: "callId is required" }, { status: 400 });
  }

  if (callId.startsWith("CA")) {
    const twilio = getTwilioAuth();
    if (!twilio) {
      return NextResponse.json({ error: "Twilio API is not configured" }, { status: 500 });
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Calls/${callId}.json`, {
      headers: {
        Authorization: twilio.authorization,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Twilio status failed", details: errorText.slice(0, 300) },
        { status: 502 },
      );
    }

    const call = (await response.json()) as {
      sid?: string;
      status?: string;
      duration?: string;
    };
    const failedStatuses = new Set(["busy", "failed", "no-answer", "canceled"]);
    const normalizedStatus =
      call.status === "completed" ? "ended" : failedStatuses.has(call.status || "") ? "failed" : call.status;

	    return NextResponse.json({
	      status: normalizedStatus,
	      handoffStatus: inferHandoffStatus({ status: call.status }),
	      evidenceLabel: publicEvidenceLabel(inferHandoffStatus({ status: call.status })),
	      retryable: normalizedStatus === "failed",
	      facilityResponses: facilityResponsesFromEvidence(inferHandoffStatus({ status: call.status })),
	    });
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
  const vapiCallFailed = isFailedCallEndReason(call.endedReason);
  const normalizedStatus = vapiCallFailed ? "failed" : call.status;
  const handoffStatus = inferHandoffStatus({
    status: normalizedStatus,
    endedReason: call.endedReason,
    transcript: call.transcript,
    summary: call.summary,
  });

  return NextResponse.json({
    status: normalizedStatus,
    handoffStatus,
    evidenceLabel: publicEvidenceLabel(handoffStatus),
    retryable: handoffStatus === "failed",
    facilityResponses: facilityResponsesFromEvidence(handoffStatus, publicEvidenceLabel(handoffStatus)),
  });
}
