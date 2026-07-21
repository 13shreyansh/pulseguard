import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

function fallbackText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { name: "speech-finalize", limit: 8, windowMs: 5 * 60_000 });
  if (limited) return limited;

  const apiKey = process.env.OPENAI_API_KEY;
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "The audio upload was unreadable." }, { status: 400 });
  }
  const fallback = fallbackText(formData.get("fallbackText"));
  const audio = formData.get("audio");

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ text: fallback.slice(0, 2_000), source: "realtime_fallback" }, { headers: { "Cache-Control": "no-store" } });
  }

  const supportedTypes = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"]);
  if (audio.size > 10 * 1024 * 1024 || (audio.type && !supportedTypes.has(audio.type.split(";")[0]))) {
    return NextResponse.json({ error: "Use a supported audio recording no larger than 10 MB." }, { status: 413 });
  }

  if (!apiKey) {
    return NextResponse.json({ text: fallback.slice(0, 2_000), source: "realtime_fallback" }, { headers: { "Cache-Control": "no-store" } });
  }

  const outbound = new FormData();
  outbound.set("file", audio, audio.name || "pulse-report.webm");
  outbound.set("model", process.env.OPENAI_FINAL_TRANSCRIPTION_MODEL || "gpt-4o-transcribe");
  outbound.set("response_format", "json");
  outbound.set(
    "prompt",
    "This is a short emergency bystander report. Preserve injuries, location clues, breathing, bleeding, consciousness, age, and what happened. Use plain English.",
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outbound,
      signal: controller.signal,
    });
  } catch {
    return NextResponse.json({ text: fallback.slice(0, 2_000), source: "realtime_fallback" }, { headers: { "Cache-Control": "no-store" } });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return NextResponse.json({ text: fallback.slice(0, 2_000), source: "realtime_fallback" }, { headers: { "Cache-Control": "no-store" } });
  }

  const data = (await response.json().catch(() => null)) as { text?: string } | null;
  const text = data?.text?.trim();

  return NextResponse.json(
    { text: (text || fallback).slice(0, 2_000), source: text ? "openai" : "realtime_fallback" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
