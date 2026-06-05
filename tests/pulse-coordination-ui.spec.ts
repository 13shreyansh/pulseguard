import { expect, type Page, test } from "playwright/test";

const baseURL = process.env.PULSE_TEST_BASE_URL || "http://localhost:3000";

const triage = {
  title: "Major trauma detected",
  emergencyType: "MAJOR_TRAUMA",
  severity: "high",
  hospitalType: "Trauma-capable emergency care required",
  signals: ["Impact injury reported", "Movement risk needs control"],
  warning: "Do not move the person unless there is immediate danger.",
  actions: ["Keep them still", "Check for bleeding", "Keep them awake", "Watch breathing"],
  situationSummary: "The person may have a serious injury. Keep them still and make the area safe.",
  doNow: ["Keep them still", "Check for bleeding", "Keep people back", "Watch breathing"],
  doNotDo: ["Do not move them unless there is danger", "Do not give food or drink", "Do not crowd around them"],
  watchFor: ["Breathing changes", "Heavy bleeding", "Confusion or fainting"],
  infographicBrief: "Show a calm bystander keeping an injured person still, checking bleeding, clearing space, and watching breathing.",
  dispatchBrief: "Major trauma reported by bystander. Trauma-capable emergency care required.",
  source: "openai",
};

const hospitals = [
  {
    id: "hospital-1",
    name: "City Trauma Centre",
    address: "Main Road",
    phone: "+15551234567",
    distanceKm: 2.4,
    travelTimeMinutes: 8,
    score: 88,
    confidence: "high",
    rankingReason: "8 min estimated drive; listed phone available; appears operational",
    mapsUrl: "https://maps.example/hospital-1",
    source: "google_places",
  },
  {
    id: "hospital-2",
    name: "General Emergency Hospital",
    address: "Second Road",
    phone: "+15557654321",
    distanceKm: 4.1,
    travelTimeMinutes: 14,
    score: 76,
    confidence: "medium",
    rankingReason: "14 min estimated drive; listed phone available",
    mapsUrl: "https://maps.example/hospital-2",
    source: "google_places",
  },
];

function coordinationSession(handoffStatus: "accepted" | "not_confirmed" | "calling") {
  return {
    id: "coord-test",
    mode: "sequential_demo",
    handoffStatus,
    selectedDestination: hospitals[0],
    contactTargets: [
      {
        id: "hospital-1",
        type: "hospital_candidate",
        name: hospitals[0].name,
        phone: hospitals[0].phone,
        status: "selected",
        note: "Selected for the first sequential coordination call.",
      },
      {
        id: "local-emergency-services",
        type: "emergency_services",
        name: "Local emergency services",
        status: "manual_required",
        note: "Visible fallback action.",
      },
    ],
    facilityQuestions: [
      {
        id: "receive_now",
        label: "Can your emergency desk receive this patient right now?",
        required: true,
      },
      {
        id: "capability_available",
        label: "Do you have trauma or orthopedic emergency support available right now?",
        required: true,
      },
      {
        id: "er_capacity",
        label: "Is your emergency ward able to start assessment without avoidable delay?",
        required: true,
      },
    ],
    facilityResponses: [
      {
        questionId: "receive_now",
        status: handoffStatus === "accepted" ? "yes" : handoffStatus === "not_confirmed" ? "unknown" : "pending",
        evidence: handoffStatus === "accepted" ? "Receiver confirmed they can receive the patient." : undefined,
      },
      {
        questionId: "capability_available",
        status: handoffStatus === "accepted" ? "yes" : handoffStatus === "not_confirmed" ? "unknown" : "pending",
      },
      {
        questionId: "er_capacity",
        status: handoffStatus === "accepted" ? "yes" : handoffStatus === "not_confirmed" ? "unknown" : "pending",
      },
    ],
    callAttempts: [
      {
        id: "attempt-1",
        targetId: "hospital-1",
        targetName: hospitals[0].name,
        targetType: "hospital_candidate",
        status: handoffStatus === "calling" ? "queued" : "ended",
        callId: "call-accepted",
        callProvider: "vapi",
        dialedNumberLabel: "configured coordination line",
        routing: "configured_demo_line",
      },
    ],
    bystanderGuidance: {
      warning: triage.warning,
      actions: triage.actions,
      emergencyServicesInstruction: "If Pulse cannot confirm handoff, call your local emergency number now.",
    },
    timeline: [
      {
        id: "guidance",
        label: "Guidance shown",
        detail: triage.warning,
        state: "done",
      },
      {
        id: "destination",
        label: "Nearby care selected",
        detail: hospitals[0].name,
        state: "done",
      },
      {
        id: "brief",
        label: "Details shared",
        detail: "GPS, report, triage, and candidate list were sent to the coordination line.",
        state: "done",
      },
      {
        id: "facility-call",
        label: handoffStatus === "accepted" ? "Help accepted the case" : "Calling for help",
        detail: handoffStatus === "accepted" ? "The selected facility accepted the handoff." : "configured demo line",
        state: handoffStatus === "accepted" ? "done" : "active",
      },
    ],
  };
}

test.use({
  baseURL,
  geolocation: { latitude: 1.3521, longitude: 103.8198 },
  permissions: ["geolocation", "microphone"],
  viewport: { width: 390, height: 844 },
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--no-sandbox",
    ],
  },
});

async function mockIntake(page: Page, handoffStatus: "accepted" | "not_confirmed") {
  await page.route("**/api/realtime/session", async (route) => {
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "mocked" }) });
  });
  await page.route("**/api/triage", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ triage }) });
  });
  await page.route("**/api/speech/finalize", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        text: "A person fell near the road, is awake, breathing, and may have a broken leg.",
        source: "openai",
      }),
    });
  });
  await page.route("**/api/guidance/infographic", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "generated",
        imageDataUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        altText: triage.situationSummary,
        caption: "Here is a simple visual guide for what to do now.",
        source: "openai",
      }),
    });
  });
  await page.route("**/api/hospitals?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        incidentLocation: { label: "Current GPS location", latitude: 1.3521, longitude: 103.8198, source: "gps" },
        hospitals,
        source: "google_places",
      }),
    });
  });
  await page.route("**/api/dispatch/call", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        callId: "call-accepted",
        status: "ended",
        callProvider: "vapi",
        receivingPhone: "configured coordination line",
        callTarget: "coordination_session",
        selectedHospitalPhone: hospitals[0].phone,
        selectedDestination: hospitals[0],
        operatorMessage: { status: "sent", provider: "webhook", id: "message-1" },
        handoffStatus,
        coordinationSession: coordinationSession(handoffStatus),
      }),
    });
  });
}

test("mobile panic flow shows guidance before dispatch and accepted coordination evidence", async ({ page }) => {
  await mockIntake(page, "accepted");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Do this now" })).toBeVisible();
  await expect(page.getByText("Check breathing")).toBeVisible();

  await page.getByRole("button", { name: "Start Emergency Help" }).click();
  await expect(page.getByLabel("I heard this")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Listening now").or(page.getByText("Typing is okay"))).toBeVisible();
  await expect(page.getByRole("heading", { name: "Do this now" })).toBeVisible();

  await page.getByLabel("I heard this").fill("A person fell near the road, is awake, breathing, and may have a broken leg.");
  await page.getByRole("button", { name: "Check what I heard" }).click();
  await expect(page.getByRole("heading", { name: "This is what I heard." })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Pulse cleaned up the wording from your voice.")).toBeVisible();
  await page.getByRole("button", { name: "Looks right" }).click();

  await expect(page.getByRole("heading", { name: "Help has accepted the case." })).toBeVisible({ timeout: 20000 });
  await expect(await page.getByText("City Trauma Centre", { exact: true }).count()).toBeGreaterThan(0);
  await expect(page.getByText("What Pulse asked")).toBeVisible();
  await expect(await page.getByText("Confirmed", { exact: true }).count()).toBeGreaterThan(0);
  await expect(page.getByAltText(triage.situationSummary)).toBeVisible();
});

test("mobile panic flow does not overstate an unconfirmed handoff", async ({ page }) => {
  await mockIntake(page, "not_confirmed");

  await page.goto("/");
  await page.getByRole("button", { name: "Start Emergency Help" }).click();
  await expect(page.getByLabel("I heard this")).toBeVisible({ timeout: 15000 });
  await page.getByLabel("I heard this").fill("A person collapsed after a collision and needs urgent help.");
  await page.getByRole("button", { name: "Check what I heard" }).click();
  await expect(page.getByRole("heading", { name: "This is what I heard." })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Looks right" }).click();

  await expect(page.getByRole("heading", { name: "Help was not confirmed." })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Call local emergency services now")).toBeVisible();
  await expect(await page.getByText("Not confirmed", { exact: true }).count()).toBeGreaterThan(0);
});
