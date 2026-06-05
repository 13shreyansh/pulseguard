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

export function issueDispatchSession(clientKey: string) {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(12).toString("base64url");
  const payload = `${issuedAt}.${nonce}.${clientKey}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyDispatchSession(token: string | undefined, clientKey: string) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [issuedAtRaw, nonce, tokenClientKey, signature] = parts;
  if (!issuedAtRaw || !nonce || tokenClientKey !== clientKey || !signature) return false;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > TOKEN_TTL_MS) return false;

  const payload = `${issuedAtRaw}.${nonce}.${tokenClientKey}`;
  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
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
