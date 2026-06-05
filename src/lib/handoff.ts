export type HandoffStatus = "calling" | "connected" | "accepted" | "not_confirmed" | "failed";

const FAILED_STATUSES = new Set(["busy", "failed", "no-answer", "canceled"]);

export function isFailedCallEndReason(endedReason?: string) {
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

export function textSuggestsRejection(text?: string) {
  if (!text) return false;
  return /\b(no|not available|fully booked|full|at capacity|cannot receive|can't receive|unavailable|try another|do not send|not possible|no beds|divert)\b/i.test(text);
}

export function textSuggestsAcceptance(text?: string) {
  if (!text) return false;
  if (textSuggestsRejection(text)) return false;
  return /\b(yes|accepted|can receive|we can receive|can take|we can take|send them|bring them|take over|confirmed|ready to receive)\b/i.test(text);
}

export function inferHandoffStatus(input: {
  status?: string;
  endedReason?: string;
  transcript?: string;
  summary?: string;
}): HandoffStatus {
  const evidence = [input.summary, input.transcript].filter(Boolean).join("\n");

  if (isFailedCallEndReason(input.endedReason) || FAILED_STATUSES.has(input.status || "")) {
    return "failed";
  }

  if (input.status === "in-progress") return "connected";
  if (input.status === "queued" || input.status === "ringing") return "calling";

  if (input.status === "ended" || input.status === "completed") {
    if (textSuggestsRejection(evidence)) return "not_confirmed";
    if (textSuggestsAcceptance(evidence)) return "accepted";
    return "not_confirmed";
  }

  return "calling";
}

export function facilityResponsesFromEvidence(handoffStatus: HandoffStatus, evidence?: string) {
  const responseStatus =
    handoffStatus === "accepted"
      ? "yes"
      : handoffStatus === "not_confirmed" || handoffStatus === "failed"
        ? "unknown"
        : "pending";

  return ["receive_now", "capability_available", "er_capacity", "ambulance_handoff"].map((questionId) => ({
    questionId,
    status: responseStatus,
    evidence: responseStatus === "pending" ? undefined : evidence,
  }));
}
