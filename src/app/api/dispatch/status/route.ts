import { NextRequest, NextResponse } from "next/server";
import { getClientKey, verifyStatusToken } from "@/lib/dispatch-session";
import { facilityResponsesFromEvidence, inferHandoffStatus, isFailedCallEndReason } from "@/lib/handoff";
import { rateLimit } from "@/lib/rate-limit";

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
  const limited = await rateLimit(request, { name: "dispatch-status", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const statusToken = request.nextUrl.searchParams.get("statusToken");
  const callId = verifyStatusToken(statusToken || undefined, getClientKey(request));

  if (!callId) {
    return NextResponse.json({ error: "A valid status token is required" }, { status: 403 });
  }

  if (callId.startsWith("CA")) {
    const twilio = getTwilioAuth();
    if (!twilio) {
      return NextResponse.json({ error: "Status check is not configured" }, { status: 500 });
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Calls/${callId}.json`, {
      headers: {
        Authorization: twilio.authorization,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Status check failed" },
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
    return NextResponse.json({ error: "Status check is not configured" }, { status: 500 });
  }

  const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Status check failed" },
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
