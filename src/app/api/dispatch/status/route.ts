import { NextRequest, NextResponse } from "next/server";
import { extractDispatchEvidence, unknownEvidence, type DispatchEvidence } from "@/lib/dispatch-evidence";
import { getClientKey, verifyStatusToken } from "@/lib/dispatch-session";
import { isFailedCallEndReason } from "@/lib/handoff";
import { rateLimit } from "@/lib/rate-limit";

type VapiMessage = { role?: string; speaker?: string; content?: string; text?: string };
type VapiCall = {
  status?: string;
  endedReason?: string;
  transcript?: string;
  artifact?: { transcript?: string; messages?: VapiMessage[] };
  messages?: VapiMessage[];
};

const terminalEvidence = new Map<string, DispatchEvidence>();

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function transcriptFromMessages(messages?: VapiMessage[]) {
  return (messages || [])
    .map((message) => {
      const role = message.role || message.speaker || "unknown";
      const content = message.content || message.text || "";
      return content.trim() ? `${role}: ${content.trim()}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function fullTranscript(call: VapiCall) {
  return transcriptFromMessages(call.artifact?.messages) ||
    call.artifact?.transcript?.trim() ||
    transcriptFromMessages(call.messages) ||
    call.transcript?.trim() ||
    "";
}

export function recipientTranscript(transcript: string) {
  return transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(user|customer|recipient|receiver|human)\s*:/i.test(line))
    .map((line) => line.replace(/^[^:]+:\s*/, ""))
    .filter(Boolean)
    .join("\n");
}

function unreachableReason(reason?: string) {
  return Boolean(reason && /busy|no-answer|did-not-answer|rejected|cancelled|canceled/i.test(reason));
}

function outcomeForEvidence(evidence: DispatchEvidence) {
  if (evidence.vehicleAssigned.result === "yes") return "dispatch_confirmed";
  if (evidence.briefReceived.result === "yes") return "desk_receipt_only";
  if (evidence.briefReceived.result === "no") return "declined";
  return "technical_failure";
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { name: "dispatch-status", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const callId = verifyStatusToken(request.nextUrl.searchParams.get("statusToken") || undefined, getClientKey(request));
  if (!callId) return response({ error: "A valid secure status token is required." }, 403);
  if (callId.startsWith("preflight-")) return response({ error: "This status token cannot be polled." }, 403);
  if (callId.startsWith("CA")) {
    return response({
      status: "failed",
      terminal: true,
      outcome: "technical_failure",
      evidence: unknownEvidence("This call provider did not return speaker-attributed evidence."),
    });
  }

  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) return response({ error: "Controlled desk status is not configured." }, 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  let providerResponse: Response;
  try {
    providerResponse = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
  } catch {
    return response({ error: "The controlled desk status check timed out." }, 504);
  } finally {
    clearTimeout(timer);
  }
  if (!providerResponse.ok) return response({ error: "The controlled desk status check failed." }, 502);

  const call = (await providerResponse.json()) as VapiCall;
  const failed = isFailedCallEndReason(call.endedReason) || call.status === "failed";
  const terminal = failed || call.status === "ended" || call.status === "completed";

  if (!terminal) {
    return response({
      status: call.status || "queued",
      terminal: false,
      handoffStatus: call.status === "in-progress" ? "connected" : "calling",
    });
  }

  if (failed) {
    return response({
      status: "failed",
      terminal: true,
      outcome: unreachableReason(call.endedReason) ? "unreachable" : "technical_failure",
      evidence: unknownEvidence(unreachableReason(call.endedReason)
        ? "The controlled desk did not answer the call."
        : "The provider could not complete the controlled call."),
    });
  }

  let evidence = terminalEvidence.get(callId);
  if (!evidence) {
    const transcript = fullTranscript(call);
    try {
      evidence = await extractDispatchEvidence({
        callId,
        fullTranscript: transcript,
        recipientTranscript: recipientTranscript(transcript),
      });
    } catch {
      evidence = unknownEvidence("GPT-5.6 could not verify field-specific recipient evidence.");
    }
    terminalEvidence.set(callId, evidence);
  }

  return response({
    status: "ended",
    terminal: true,
    outcome: outcomeForEvidence(evidence),
    evidence,
  });
}
