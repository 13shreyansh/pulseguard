import { expect, test } from "playwright/test";
import { validateEvidence, type ModelEvidence } from "../src/lib/dispatch-evidence";

function modelEvidence(overrides: Partial<ModelEvidence> = {}): ModelEvidence {
  return {
    briefReceived: { result: "unknown", evidence: null },
    vehicleAssigned: { result: "unknown", evidence: null },
    destination: { value: null, evidence: null },
    etaMinutes: { value: null, evidence: null },
    uncertaintyReason: null,
    ...overrides,
  };
}

test("a generic yes cannot confirm vehicle assignment", () => {
  const evidence = validateEvidence(modelEvidence({
    briefReceived: { result: "yes", evidence: "Yes" },
    vehicleAssigned: { result: "yes", evidence: "Yes" },
  }), "Yes");
  expect(evidence.briefReceived.result).toBe("yes");
  expect(evidence.vehicleAssigned.result).toBe("unknown");
});

test("vehicle assignment needs an explicit recipient statement", () => {
  const quote = "A response unit has been assigned and is on the way";
  const evidence = validateEvidence(modelEvidence({
    vehicleAssigned: { result: "yes", evidence: quote },
  }), quote);
  expect(evidence.vehicleAssigned).toEqual({ result: "yes", evidence: quote });
});

test("assistant-only or invented excerpts are rejected", () => {
  const evidence = validateEvidence(modelEvidence({
    vehicleAssigned: { result: "yes", evidence: "An ambulance has been assigned" },
  }), "I received the message, but no ambulance has been assigned");
  expect(evidence.vehicleAssigned.result).toBe("unknown");
});

test("destination and ETA require independent exact excerpts", () => {
  const recipient = "The confirmed destination is Central General Hospital\nThe ETA is 12 minutes";
  const evidence = validateEvidence(modelEvidence({
    destination: { value: "Central General Hospital", evidence: "The confirmed destination is Central General Hospital" },
    etaMinutes: { value: 12, evidence: "The ETA is 12 minutes" },
  }), recipient);
  expect(evidence.destination.result).toBe("known");
  expect(evidence.eta).toMatchObject({ result: "known", minutes: 12 });
});
