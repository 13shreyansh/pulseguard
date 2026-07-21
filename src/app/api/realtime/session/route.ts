import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

function realtimeTranscriptionModel() {
  const configuredModel = process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL?.trim();

  if (
    !configuredModel ||
    configuredModel === "gpt-4o-transcribe" ||
    configuredModel === "gpt-4o-mini-transcribe" ||
    configuredModel === "whisper-1"
  ) {
    return "gpt-realtime-whisper";
  }

  return configuredModel;
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { name: "realtime-session", limit: 8, windowMs: 60_000 });
  if (limited) return limited;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI Realtime is not configured" }, { status: 500 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "transcription",
          audio: {
            input: {
              format: {
                type: "audio/pcm",
                rate: 24000,
              },
              noise_reduction: { type: "near_field" },
              transcription: {
                model: realtimeTranscriptionModel(),
                language: "en",
                delay: process.env.OPENAI_REALTIME_TRANSCRIPTION_DELAY || "low",
              },
            },
          },
          include: ["item.input_audio_transcription.logprobs"],
        },
      }),
    });
  } catch {
    return NextResponse.json({ error: "Realtime speech session timed out" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "Realtime speech session failed" },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    id?: string;
    value?: string;
    expires_at?: number;
    session?: {
      id?: string;
    };
    client_secret?: {
      value?: string;
      expires_at?: number;
    };
  };

  const clientSecret = data.client_secret?.value || data.value;
  if (!clientSecret) {
    return NextResponse.json({ error: "OpenAI Realtime session did not return a client secret" }, { status: 502 });
  }

  return NextResponse.json(
    {
      id: data.session?.id || data.id,
      clientSecret,
      expiresAt: data.client_secret?.expires_at || data.expires_at,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
