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
  "sequential",
  "candidate",
  "coordination",
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

test.skip(
  process.env.PULSE_ALLOW_LIVE_AUDIT !== "true",
  "Set PULSE_ALLOW_LIVE_AUDIT=true to run the live production audit.",
);

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
  await expect(page.getByRole("heading", { name: "Get help now" })).toBeVisible();

  const startText = await page.locator("body").innerText();
  for (const term of forbiddenPublicTerms) {
    expect(startText, `public start UI should not contain ${term}`).not.toContain(term);
  }

  await page.getByRole("button", { name: /Start Emergency Help/i }).click();
  await expect(page.getByLabel("Tell me what happened")).toBeVisible({ timeout: 20000 });

  const listenText = await page.locator("body").innerText();
  expect(listenText).toContain("I’m listening");
  expect(listenText).toMatch(/Location shared|Getting location/);

  await page.getByLabel("Tell me what happened").fill(
    "Controlled Pulse verification. No real person needs help. A person in this practice scenario fell near the roadside, is awake and breathing, may have leg pain, and there is no visible heavy bleeding.",
  );
  await page.getByRole("button", { name: /Review report/i }).click();
  await expect(page.getByRole("heading", { name: "This is what I heard." })).toBeVisible({ timeout: 20000 });
  await expect(page.getByLabel("I heard this")).toHaveValue(/practice scenario/);
  await page.getByRole("button", { name: /Send for help/i }).click();

  await expect(page.getByRole("heading", { name: /I.m contacting help|Help is ready|Pulse could not confirm help|Help was not confirmed/i })).toBeVisible({
    timeout: 20000,
  });

  await expect(page.getByRole("heading", { name: /Help is ready|Pulse could not confirm help|Help was not confirmed/i })).toBeVisible({
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
  for (const term of forbiddenPublicTerms) {
    expect(finalText, `public final UI should not contain ${term}`).not.toContain(term);
  }

  const dispatchCall = apiResults.find((item) => item.url.endsWith("/api/dispatch/call"));
  expect(dispatchCall?.status, "dispatch call endpoint should return a response").toBeDefined();
});
