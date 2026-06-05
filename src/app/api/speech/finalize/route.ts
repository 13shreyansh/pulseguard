import { NextRequest, NextResponse } from "next/server";

function fallbackText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  const formData = await request.formData();
  const fallback = fallbackText(formData.get("fallbackText"));
  const audio = formData.get("audio");

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ text: fallback, source: "realtime_fallback" });
  }

  if (!apiKey) {
    return NextResponse.json({ text: fallback, source: "realtime_fallback" });
  }

  const outbound = new FormData();
  outbound.set("file", audio, audio.name || "pulse-report.webm");
  outbound.set("model", process.env.OPENAI_FINAL_TRANSCRIPTION_MODEL || "gpt-4o-transcribe");
  outbound.set("response_format", "json");
  outbound.set(
    "prompt",
    "This is a short emergency bystander report. Preserve injuries, location clues, breathing, bleeding, consciousness, age, and what happened. Use plain English.",
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: outbound,
  });

  if (!response.ok) {
    return NextResponse.json({ text: fallback, source: "realtime_fallback" });
  }

  const data = (await response.json().catch(() => null)) as { text?: string } | null;
  const text = data?.text?.trim();

  return NextResponse.json({
    text: text || fallback,
    source: text ? "openai" : "realtime_fallback",
  });
}
