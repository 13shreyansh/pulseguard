import { expect, test } from "playwright/test";

const productionUrl = "https://pulse-beta-two.vercel.app";
const forbiddenPublicTerms = [
  "API",
  "Call ID",
  "Google Places",
  "operator phone",
  "configured",
  "readiness",
  "timeline",
  "provider",
  "score",
  "confidence",
  "mock",
  "test",
  "demo",
  "context only",
];

test.use({
  baseURL: productionUrl,
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

test("production bystander flow reaches dispatch result", async ({ page }, testInfo) => {
  const apiResults: Array<{ url: string; status: number; method: string }> = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/")) {
      apiResults.push({
        url: url.replace(/[?].*/, ""),
        status: response.status(),
        method: response.request().method(),
      });
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Start Emergency Help" })).toBeVisible();

  const startText = await page.locator("body").innerText();
  for (const term of forbiddenPublicTerms) {
    expect(startText, `public start UI should not contain ${term}`).not.toContain(term);
  }

  await page.getByRole("button", { name: /Start Emergency Help/i }).click();
  await expect(page.getByLabel("What Pulse heard")).toBeVisible({ timeout: 20000 });

  const listenText = await page.locator("body").innerText();
  expect(listenText).toContain("Tell us what happened.");
  expect(listenText).toMatch(/Location shared|Getting location/);

  await page.getByLabel("What Pulse heard").fill(
    "Controlled Pulse production verification. No real patient. A person fell near the roadside, is awake and breathing, may have leg pain, and there is no visible heavy bleeding.",
  );
  await page.getByRole("button", { name: /Send Emergency Brief/i }).click();

  await expect(page.getByRole("heading", { name: /Sending emergency brief|Help has been notified|We could not complete the call/i })).toBeVisible({
    timeout: 20000,
  });

  await expect(page.getByRole("heading", { name: /Help has been notified|We could not complete the call/i })).toBeVisible({
    timeout: 90000,
  });

  await testInfo.attach("api-results", {
    body: JSON.stringify(apiResults, null, 2),
    contentType: "application/json",
  });

  const finalText = await page.locator("body").innerText();
  await testInfo.attach("final-visible-text", {
    body: finalText,
    contentType: "text/plain",
  });

  const dispatchCall = apiResults.find((item) => item.url.endsWith("/api/dispatch/call"));
  expect(dispatchCall?.status, "dispatch call endpoint should return a response").toBeDefined();
});
