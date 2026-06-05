import crypto from "crypto";
import { NextRequest } from "next/server";

const TOKEN_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 45 * 1000;
const recentDispatches = new Map<string, number>();

function secretMaterial() {
  return (
    process.env.PULSE_DISPATCH_SESSION_SECRET ||
    process.env.PULSE_OPS_TOKEN ||
    process.env.OPENAI_API_KEY ||
    "pulse-local-development-secret"
  );
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secretMaterial()).update(payload).digest("base64url");
}

export function getClientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function issueDispatchSession() {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(12).toString("base64url");
  const payload = `${issuedAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyDispatchSession(token: string | undefined, clientKey: string) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 && parts.length !== 4) return false;
  const [issuedAtRaw, nonce] = parts;
  const signature = parts.length === 4 ? parts[3] : parts[2];
  if (!issuedAtRaw || !nonce || !signature) return false;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > TOKEN_TTL_MS) return false;

  const modernPayload = `${issuedAtRaw}.${nonce}`;
  const legacyPayload = parts.length === 4 ? `${issuedAtRaw}.${nonce}.${parts[2]}` : null;
  const expected = sign(modernPayload);
  const legacyExpected = legacyPayload ? sign(legacyPayload) : null;
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return true;
  }
  if (!legacyExpected || parts[2] !== clientKey) return false;
  const legacyExpectedBuffer = Buffer.from(legacyExpected);
  return signatureBuffer.length === legacyExpectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, legacyExpectedBuffer);
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
