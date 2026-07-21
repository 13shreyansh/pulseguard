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
