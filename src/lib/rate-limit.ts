import { NextRequest, NextResponse } from "next/server";
import { getClientKey } from "@/lib/dispatch-session";

type RateLimitPolicy = {
  name: string;
  limit: number;
  windowMs: number;
};

const memoryHits = new Map<string, { count: number; resetAt: number }>();

function redisConfig() {
  const url = process.env.PULSE_RATE_LIMIT_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.PULSE_RATE_LIMIT_REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function bucketKey(policy: RateLimitPolicy, clientKey: string) {
  const bucket = Math.floor(Date.now() / policy.windowMs);
  return `pulse:rate:${policy.name}:${bucket}:${clientKey}`;
}

async function redisHit(policy: RateLimitPolicy, clientKey: string) {
  const redis = redisConfig();
  if (!redis) return null;

  const key = bucketKey(policy, clientKey);
  const ttlSeconds = Math.ceil(policy.windowMs / 1000);
  const response = await fetch(`${redis.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redis.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, ttlSeconds],
    ]),
  });

  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as Array<{ result?: number }> | null;
  const count = Number(data?.[0]?.result || 0);
  return Number.isFinite(count) && count > 0 ? count : null;
}

function memoryHit(policy: RateLimitPolicy, clientKey: string) {
  const key = bucketKey(policy, clientKey);
  const now = Date.now();
  const current = memoryHits.get(key);
  if (!current || current.resetAt <= now) {
    memoryHits.set(key, { count: 1, resetAt: now + policy.windowMs });
    return { count: 1, resetAt: now + policy.windowMs };
  }

  current.count += 1;
  memoryHits.set(key, current);
  return current;
}

export async function rateLimit(request: NextRequest, policy: RateLimitPolicy) {
  const clientKey = getClientKey(request);
  const redisCount = await redisHit(policy, clientKey).catch(() => null);
  const hit = redisCount
    ? { count: redisCount, resetAt: Date.now() + policy.windowMs }
    : memoryHit(policy, clientKey);

  if (hit.count <= policy.limit) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((hit.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: "Too many requests. Please wait before trying again.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(policy.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
