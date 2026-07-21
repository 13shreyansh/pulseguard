import { NextResponse } from "next/server";
import { dispatchSecretReady } from "@/lib/dispatch-session";
import { getResponseLinePhone } from "@/lib/response-line";

type Check = { configured: boolean; verified: boolean; label: string; checkedAt: string };
let cached: { at: number; value: Record<string, Check | string> } | null = null;

async function timedFetch(url: string, init: RequestInit, timeoutMs = 5_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function openAIProbe() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;
  try {
    const result = await timedFetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-5.6", input: "Reply OK", max_output_tokens: 16, reasoning: { effort: "low" }, store: false }),
    });
    return result.ok;
  } catch {
    return false;
  }
}

async function googleProbe() {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return false;
  try {
    const result = await timedFetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
      body: JSON.stringify({ includedTypes: ["hospital"], maxResultCount: 1, locationRestriction: { circle: { center: { latitude: 1.3521, longitude: 103.8198 }, radius: 10_000 } } }),
    });
    return result.ok;
  } catch {
    return false;
  }
}

async function vapiProbe() {
  const key = process.env.VAPI_API_KEY;
  const phoneId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!key || !phoneId) return false;
  try {
    const result = await timedFetch(`https://api.vapi.ai/phone-number/${phoneId}`, { headers: { Authorization: `Bearer ${key}` } });
    return result.ok;
  } catch {
    return false;
  }
}

async function twilioProbe() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const username = process.env.TWILIO_API_KEY_SID || accountSid;
  const password = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !username || !password) return false;
  try {
    const result = await timedFetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` },
    });
    return result.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  if (cached && Date.now() - cached.at < 5 * 60_000) {
    return NextResponse.json(cached.value, { headers: { "Cache-Control": "no-store" } });
  }

  const checkedAt = new Date().toISOString();
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const googleConfigured = Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY);
  const vapiConfigured = Boolean(process.env.VAPI_API_KEY && process.env.VAPI_PHONE_NUMBER_ID);
  const twilioConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && (process.env.TWILIO_AUTH_TOKEN || (process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET)));
  const [openaiVerified, googleVerified, vapiVerified, twilioVerified] = await Promise.all([
    openAIProbe(), googleProbe(), vapiProbe(), twilioProbe(),
  ]);
  const deskConfigured = Boolean(getResponseLinePhone());
  const signingConfigured = dispatchSecretReady();
  const demoGateConfigured = Boolean(process.env.PULSE_DEMO_ACCESS_CODE);
  const mode = process.env.PULSE_DISPATCH_MODE === "dry_run" ? "dry_run" : "live";

  const value: Record<string, Check | string> = {
    checkedAt,
    mode,
    gpt56: { configured: openaiConfigured, verified: openaiVerified, label: openaiVerified ? "GPT-5.6 response verified" : "GPT-5.6 response not verified", checkedAt },
    realtime: { configured: openaiConfigured, verified: openaiVerified, label: openaiVerified ? "OpenAI access verified" : "OpenAI access not verified", checkedAt },
    google: { configured: googleConfigured, verified: googleVerified, label: googleVerified ? "Singapore hospital query verified" : "Nearby hospital context unavailable", checkedAt },
    callProvider: { configured: vapiConfigured, verified: vapiVerified, label: vapiVerified ? "Controlled call provider verified" : "Controlled call provider not verified", checkedAt },
    messageProvider: { configured: twilioConfigured || Boolean(process.env.PULSE_MESSAGE_WEBHOOK_URL), verified: twilioVerified, label: twilioVerified ? "Messaging provider verified" : "Messaging provider not verified", checkedAt },
    controlledDesk: { configured: deskConfigured, verified: deskConfigured && /^\+65\d{8}$/.test(getResponseLinePhone() || ""), label: deskConfigured ? "Fixed controlled response line configured" : "Controlled response line missing", checkedAt },
    signing: { configured: signingConfigured, verified: signingConfigured, label: signingConfigured ? "Encrypted status signing configured" : "Encrypted status signing missing", checkedAt },
    demoGate: { configured: demoGateConfigured, verified: demoGateConfigured, label: demoGateConfigured ? "Private outbound gate configured" : "Private outbound gate missing", checkedAt },
  };
  cached = { at: Date.now(), value };
  return NextResponse.json(value, { headers: { "Cache-Control": "no-store" } });
}
