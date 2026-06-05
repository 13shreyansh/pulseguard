import { expect, test } from "playwright/test";
import { inferHandoffStatus, textSuggestsAcceptance, textSuggestsRejection } from "../src/lib/handoff";

test.describe("handoff inference", () => {
  test("checks rejection before acceptance for not available", () => {
    const evidence = "We are not available. Please try another hospital.";

    expect(textSuggestsRejection(evidence)).toBe(true);
    expect(textSuggestsAcceptance(evidence)).toBe(false);
    expect(
      inferHandoffStatus({
        status: "ended",
        transcript: evidence,
      }),
    ).toBe("not_confirmed");
  });

  test("does not treat full or at capacity as accepted", () => {
    expect(inferHandoffStatus({ status: "ended", summary: "Emergency is full right now." })).toBe("not_confirmed");
    expect(inferHandoffStatus({ status: "completed", summary: "We are at capacity, divert." })).toBe("not_confirmed");
  });

  test("does not accept vague availability language", () => {
    expect(textSuggestsAcceptance("The doctor is available later today.")).toBe(false);
    expect(inferHandoffStatus({ status: "ended", summary: "The doctor is available later today." })).toBe("not_confirmed");
  });

  test("accepts explicit receive confirmation", () => {
    expect(inferHandoffStatus({ status: "ended", transcript: "Yes, we can receive the patient now." })).toBe("accepted");
    expect(inferHandoffStatus({ status: "completed", summary: "Confirmed, bring them to emergency." })).toBe("accepted");
  });

  test("keeps in-flight and failed call states separate", () => {
    expect(inferHandoffStatus({ status: "in-progress" })).toBe("connected");
    expect(inferHandoffStatus({ status: "ringing" })).toBe("calling");
    expect(inferHandoffStatus({ status: "ended", endedReason: "customer-busy" })).toBe("failed");
  });
});
