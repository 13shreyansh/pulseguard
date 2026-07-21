import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["dispatch-session.spec.ts", "dispatch-evidence.spec.ts"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
});
