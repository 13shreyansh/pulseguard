import { structuredResponse } from "@/lib/openai-responses";

export type EvidenceResult = "yes" | "no" | "unknown";

export type DispatchEvidence = {
  briefReceived: { result: EvidenceResult; evidence?: string };
  vehicleAssigned: { result: EvidenceResult; evidence?: string };
  destination: { result: "known" | "unknown"; value?: string; evidence?: string };
  eta: { result: "known" | "unknown"; minutes?: number; evidence?: string };
  uncertaintyReason?: string;
};

export type ModelEvidence = {
  briefReceived: { result: EvidenceResult; evidence: string | null };
  vehicleAssigned: { result: EvidenceResult; evidence: string | null };
  destination: { value: string | null; evidence: string | null };
  etaMinutes: { value: number | null; evidence: string | null };
  uncertaintyReason: string | null;
};

const evidenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    briefReceived: {
      type: "object",
      additionalProperties: false,
      properties: {
        result: { type: "string", enum: ["yes", "no", "unknown"] },
        evidence: { type: ["string", "null"], maxLength: 240 },
      },
      required: ["result", "evidence"],
    },
    vehicleAssigned: {
      type: "object",
      additionalProperties: false,
      properties: {
        result: { type: "string", enum: ["yes", "no", "unknown"] },
        evidence: { type: ["string", "null"], maxLength: 240 },
      },
      required: ["result", "evidence"],
    },
    destination: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: ["string", "null"], maxLength: 160 },
        evidence: { type: ["string", "null"], maxLength: 240 },
      },
      required: ["value", "evidence"],
    },
    etaMinutes: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: ["integer", "null"], minimum: 1, maximum: 600 },
        evidence: { type: ["string", "null"], maxLength: 240 },
      },
      required: ["value", "evidence"],
    },
    uncertaintyReason: { type: ["string", "null"], maxLength: 240 },
  },
  required: ["briefReceived", "vehicleAssigned", "destination", "etaMinutes", "uncertaintyReason"],
};

export function unknownEvidence(reason?: string): DispatchEvidence {
  return {
    briefReceived: { result: "unknown" },
    vehicleAssigned: { result: "unknown" },
    destination: { result: "unknown" },
    eta: { result: "unknown" },
    ...(reason ? { uncertaintyReason: reason } : {}),
  };
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[“”'".,!?;:()[\]{}]/g, " ").replace(/\s+/g, " ").trim();
}

function exactRecipientExcerpt(excerpt: string | null, recipientText: string) {
  if (!excerpt?.trim()) return undefined;
  const needle = normalized(excerpt);
  return needle && normalized(recipientText).includes(needle) ? excerpt.trim() : undefined;
}

function genericAffirmation(value?: string) {
  return Boolean(value && /^(yes|yeah|yep|correct|right|we do|okay|ok)$/i.test(normalized(value)));
}

export function validateEvidence(value: ModelEvidence, recipientText: string): DispatchEvidence {
  const briefQuote = exactRecipientExcerpt(value.briefReceived.evidence, recipientText);
  const vehicleQuote = exactRecipientExcerpt(value.vehicleAssigned.evidence, recipientText);
  const destinationQuote = exactRecipientExcerpt(value.destination.evidence, recipientText);
  const etaQuote = exactRecipientExcerpt(value.etaMinutes.evidence, recipientText);

  const briefReceived = value.briefReceived.result !== "unknown" && briefQuote
    ? { result: value.briefReceived.result, evidence: briefQuote }
    : { result: "unknown" as const };

  // A bare “yes” may acknowledge the first receipt question, but can never prove assignment.
  const explicitVehicle = vehicleQuote && !genericAffirmation(vehicleQuote) &&
    /\b(ambulance|vehicle|responder|crew|team|unit)\b/i.test(vehicleQuote) &&
    (/\b(assign|assigned|dispatch|dispatched|sending|sent|en route|on the way)\b/i.test(vehicleQuote) || value.vehicleAssigned.result === "no");
  const vehicleAssigned = value.vehicleAssigned.result !== "unknown" && explicitVehicle
    ? { result: value.vehicleAssigned.result, evidence: vehicleQuote }
    : { result: "unknown" as const };

  const destinationValue = value.destination.value?.trim();
  const destination = destinationValue && destinationQuote && normalized(destinationQuote).includes(normalized(destinationValue))
    ? { result: "known" as const, value: destinationValue, evidence: destinationQuote }
    : { result: "unknown" as const };

  const etaValue = value.etaMinutes.value;
  const eta = etaValue && etaQuote && new RegExp(`\\b${etaValue}\\b`).test(etaQuote)
    ? { result: "known" as const, minutes: etaValue, evidence: etaQuote }
    : { result: "unknown" as const };

  return {
    briefReceived,
    vehicleAssigned,
    destination,
    eta,
    ...(value.uncertaintyReason ? { uncertaintyReason: value.uncertaintyReason } : {}),
  };
}

export async function extractDispatchEvidence(input: {
  fullTranscript: string;
  recipientTranscript: string;
  callId: string;
}) {
  if (!input.recipientTranscript.trim()) {
    return unknownEvidence("The call transcript did not preserve recipient speaker attribution.");
  }

  const result = await structuredResponse<ModelEvidence>({
    schemaName: "pulse_dispatch_evidence",
    schema: evidenceSchema,
    safetySeed: input.callId,
    timeoutMs: 12_000,
    maxOutputTokens: 800,
    instructions: [
      "Extract evidence from an automated controlled-dispatch call. Only recipient/customer speech can be evidence.",
      "The assistant's statements and summaries are never evidence, even if the assistant says confirmed.",
      "Use exact short excerpts copied from RECIPIENT-ONLY TRANSCRIPT. If a field lacks explicit recipient evidence, return unknown or null.",
      "A generic yes can answer only the single immediately preceding question. It must never confirm multiple fields.",
      "Vehicle assignment requires an explicit statement that a responder, crew, unit, vehicle, or ambulance was assigned, dispatched, sent, or is en route.",
      "Receipt, assignment, destination, and ETA are independent. Never derive one from another.",
    ].join("\n"),
    input: [
      "FULL SPEAKER-LABELLED TRANSCRIPT:",
      input.fullTranscript,
      "",
      "RECIPIENT-ONLY TRANSCRIPT:",
      input.recipientTranscript,
    ].join("\n"),
  });

  return validateEvidence(result.value, input.recipientTranscript);
}
