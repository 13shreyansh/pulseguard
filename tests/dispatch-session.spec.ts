import { expect, test } from "playwright/test";
import {
  issueDispatchSession,
  issueStatusToken,
  verifyDispatchSession,
  verifyStatusToken,
} from "../src/lib/dispatch-session";

test.describe("dispatch session tokens", () => {
  test("binds dispatch token to client and reviewed report", () => {
    const token = issueDispatchSession({
      clientKey: "198.51.100.10",
      report: "A person fell near the road and may have a broken leg.",
    });

    expect(token).toBeTruthy();
    expect(
      verifyDispatchSession(
        token || undefined,
        "198.51.100.10",
        "A person fell near the road and may have a broken leg.",
      ),
    ).toBe(true);
    expect(
      verifyDispatchSession(
        token || undefined,
        "198.51.100.11",
        "A person fell near the road and may have a broken leg.",
      ),
    ).toBe(false);
    expect(
      verifyDispatchSession(
        token || undefined,
        "198.51.100.10",
        "A different report should not verify.",
      ),
    ).toBe(false);
  });

  test("keeps status call IDs inside an encrypted client-bound token", () => {
    const token = issueStatusToken({
      callId: "call-sensitive-id",
      clientKey: "198.51.100.10",
    });

    expect(token).toBeTruthy();
    expect(token).not.toContain("call-sensitive-id");
    expect(verifyStatusToken(token || undefined, "198.51.100.10")).toBe("call-sensitive-id");
    expect(verifyStatusToken(token || undefined, "198.51.100.11")).toBeNull();
  });
});
