import crypto from "crypto";
import { NextRequest } from "next/server";

const TOKEN_TTL_MS = 10 * 60 * 1000;
const STATUS_TOKEN_TTL_MS = 30 * 60 * 1000;
const COOLDOWN_MS = 45 * 1000;
const recentDispatches = new Map<string, number>();

function secretMaterial() {
  const secret = process.env.PULSE_DISPATCH_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") return null;
  return "pulse-local-development-secret";
}

function sign(payload: string) {
  const secret = secretMaterial();
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function secretKey() {
  const secret = secretMaterial();
  if (!secret) return null;
  return crypto.createHash("sha256").update(secret).digest();
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value.trim().replace(/\s+/g, " ").toLowerCase()).digest("base64url");
}

function timingEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getClientKey(request: NextRequest) {
  const browserSession = request.headers.get("x-pulse-client-id")?.trim();
  if (browserSession && /^[a-zA-Z0-9_-]{12,80}$/.test(browserSession)) {
    return `browser:${browserSession}`;
  }
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function dispatchSecretReady() {
  return Boolean(secretMaterial());
}

type DispatchSessionInput = {
  clientKey: string;
  report: string;
  incidentId?: string;
  location?: string;
};

export function issueDispatchSession(input: DispatchSessionInput) {
  const payload = Buffer.from(JSON.stringify({
    version: 2,
    issuedAt: Date.now(),
    nonce: crypto.randomBytes(12).toString("base64url"),
    clientHash: hashValue(input.clientKey),
    incidentId: input.incidentId || "legacy",
    reportHash: hashValue(input.report),
    locationHash: hashValue(input.location || "legacy"),
  })).toString("base64url");
  const signature = sign(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

export function verifyDispatchSession(
  token: string | undefined,
  clientKey: string,
  report: string,
  incidentId = "legacy",
  location = "legacy",
) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!payload || !signature) return false;
  const expected = sign(payload);
  if (!expected || !timingEqual(signature, expected)) return false;

  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      issuedAt?: number;
      clientHash?: string;
      incidentId?: string;
      reportHash?: string;
      locationHash?: string;
    };
    if (!value.issuedAt || Date.now() - value.issuedAt > TOKEN_TTL_MS || value.issuedAt > Date.now() + 30_000) return false;
    if (!value.clientHash || !timingEqual(value.clientHash, hashValue(clientKey))) return false;
    if (!value.reportHash || !timingEqual(value.reportHash, hashValue(report))) return false;
    if (!value.locationHash || !timingEqual(value.locationHash, hashValue(location))) return false;
    return value.incidentId === incidentId;
  } catch {
    return false;
  }
}

export function validDemoAccessCode(value?: string) {
  const expected = process.env.PULSE_DEMO_ACCESS_CODE?.trim();
  const supplied = value?.trim();
  if (!expected || !supplied || supplied.length > 128) return false;
  return timingEqual(hashValue(supplied), hashValue(expected));
}

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    const originHost = new URL(origin).host;
    const allowedHosts = [
      request.headers.get("host"),
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim(),
      request.nextUrl.host,
    ].filter(Boolean);
    return allowedHosts.includes(originHost) && request.headers.get("sec-fetch-site") !== "cross-site";
  } catch {
    return false;
  }
}

export function issueStatusToken(input: { callId: string; clientKey: string }) {
  const key = secretKey();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const payload = JSON.stringify({
    callId: input.callId,
    clientHash: hashValue(input.clientKey),
    issuedAt: Date.now(),
    nonce: crypto.randomBytes(12).toString("base64url"),
  });
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function verifyStatusToken(token: string | undefined, clientKey: string) {
  if (!token) return null;
  const key = secretKey();
  if (!key) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const [ivRaw, tagRaw, encryptedRaw] = parts;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(decrypted) as { callId?: string; clientHash?: string; issuedAt?: number };
    if (!payload.callId || !payload.clientHash || !payload.issuedAt) return null;
    if (Date.now() - payload.issuedAt > STATUS_TOKEN_TTL_MS) return null;
    if (!timingEqual(payload.clientHash, hashValue(clientKey))) return null;
    return payload.callId;
  } catch {
    return null;
  }
}

export function checkDispatchCooldown(clientKey: string) {
  const now = Date.now();
  const last = recentDispatches.get(clientKey) || 0;
  if (now - last < COOLDOWN_MS) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((COOLDOWN_MS - (now - last)) / 1000),
    };
  }

  recentDispatches.set(clientKey, now);
  return { ok: true, retryAfterSeconds: 0 };
}
