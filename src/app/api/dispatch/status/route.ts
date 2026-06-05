import { NextRequest, NextResponse } from "next/server";

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

function isFailedVapiEndReason(endedReason?: string) {
  if (!endedReason) return false;

  return (
    endedReason.startsWith("call.start.error") ||
    endedReason === "customer-busy" ||
    endedReason === "customer-did-not-answer" ||
    endedReason === "customer-cancelled" ||
    endedReason === "customer-rejected" ||
    endedReason === "phone-call-provider-bypass-enabled-but-no-call-received" ||
    endedReason.includes("no-answer") ||
    endedReason.includes("busy")
  );
}

function textSuggestsAcceptance(text?: string) {
  if (!text) return false;
  return /\b(yes|accepted|can receive|we can receive|available|send them|bring them|take over|confirmed)\b/i.test(text);
}

function textSuggestsRejection(text?: string) {
  if (!text) return false;
  return /\b(no|not available|full|cannot receive|can't receive|unavailable|try another|do not send|not possible)\b/i.test(text);
}

function inferHandoffStatus(input: {
  status?: string;
  endedReason?: string;
  transcript?: string;
  summary?: string;
}) {
  const evidence = [input.summary, input.transcript].filter(Boolean).join("\n");

  if (isFailedVapiEndReason(input.endedReason) || ["busy", "failed", "no-answer", "canceled"].includes(input.status || "")) {
    return "failed";
  }

  if (input.status === "in-progress") return "connected";
  if (input.status === "queued" || input.status === "ringing") return "calling";

  if (input.status === "ended" || input.status === "completed") {
    if (textSuggestsAcceptance(evidence)) return "accepted";
    if (textSuggestsRejection(evidence)) return "not_confirmed";
    return "not_confirmed";
  }

  return "calling";
}

function facilityResponsesFromEvidence(handoffStatus: string, transcript?: string, summary?: string) {
  const evidence = summary || transcript;
  const responseStatus =
    handoffStatus === "accepted"
      ? "yes"
      : handoffStatus === "not_confirmed"
        ? "unknown"
        : handoffStatus === "failed"
          ? "unknown"
          : "pending";

  return ["receive_now", "capability_available", "er_capacity", "ambulance_handoff"].map((questionId) => ({
    questionId,
    status: responseStatus,
    evidence: responseStatus === "pending" ? undefined : evidence,
  }));
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
	      id: call.sid,
	      status: normalizedStatus,
	      endedReason: call.status,
	      durationSeconds: call.duration ? Number(call.duration) : undefined,
	      callProvider: "twilio",
	      handoffStatus: inferHandoffStatus({ status: call.status }),
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
  const vapiCallFailed = isFailedVapiEndReason(call.endedReason);
  const normalizedStatus = vapiCallFailed ? "failed" : call.status;
  const handoffStatus = inferHandoffStatus({
    status: normalizedStatus,
    endedReason: call.endedReason,
    transcript: call.transcript,
    summary: call.summary,
  });

  return NextResponse.json({
    id: call.id,
    status: normalizedStatus,
    endedReason: call.endedReason,
    diagnosticCode: vapiCallFailed ? call.endedReason : undefined,
    transcript: call.transcript,
    summary: call.summary,
    callProvider: "vapi",
    handoffStatus,
    facilityResponses: facilityResponsesFromEvidence(handoffStatus, call.transcript, call.summary),
  });
}
