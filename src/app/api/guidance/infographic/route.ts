import { NextRequest, NextResponse } from "next/server";

type TriageLike = {
  title?: string;
  emergencyType?: string;
  warning?: string;
  actions?: string[];
  doNow?: string[];
  doNotDo?: string[];
  watchFor?: string[];
  situationSummary?: string;
  infographicBrief?: string;
};

function fallbackResponse(triage?: TriageLike) {
  return NextResponse.json({
    status: "fallback",
    altText: "Simple emergency guidance with calm steps for the bystander.",
    caption: triage?.situationSummary || "Follow the steps on screen and stay with the person.",
    source: "fallback",
  });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  const body = (await request.json().catch(() => null)) as {
    transcript?: string;
    triage?: TriageLike;
    incidentLocation?: { label?: string };
  } | null;

  if (!body?.transcript || !body.triage) {
    return fallbackResponse(body?.triage);
  }

  if (!apiKey) {
    return fallbackResponse(body.triage);
  }

  const actions = (body.triage.doNow?.length ? body.triage.doNow : body.triage.actions || []).slice(0, 4);
  const avoid = (body.triage.doNotDo || []).slice(0, 4);
  const watch = (body.triage.watchFor || []).slice(0, 3);
  const prompt = [
    "Create a calm, non-graphic emergency bystander pictorial guide.",
    "Style: warm public-safety illustration, soft colors, simple people, no blood detail, no gore, no panic, no tiny text.",
    "Layout: 3 clear panels showing what a bystander should do. Leave clean open space for app text overlays.",
    `Situation: ${body.triage.situationSummary || body.triage.title || "Emergency reported by a bystander"}.`,
    `Visual brief: ${body.triage.infographicBrief || "Show safe bystander help while professional help is contacted."}`,
    actions.length ? `Show these actions visually: ${actions.join("; ")}.` : null,
    avoid.length ? `Avoid showing these as recommended actions: ${avoid.join("; ")}.` : null,
    watch.length ? `Subtly suggest watching for: ${watch.join("; ")}.` : null,
    "Do not include medical equipment procedures beyond basic bystander safety. Do not depict surgery, injections, graphic wounds, or distressing closeups.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "low",
      output_format: "jpeg",
    }),
  });

  if (!response.ok) {
    return fallbackResponse(body.triage);
  }

  const data = (await response.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string; revised_prompt?: string }>;
  } | null;
  const imageBase64 = data?.data?.[0]?.b64_json;

  if (!imageBase64) {
    return fallbackResponse(body.triage);
  }

  return NextResponse.json({
    status: "generated",
    imageDataUrl: `data:image/jpeg;base64,${imageBase64}`,
    altText: body.triage.situationSummary || "Calm emergency bystander guidance illustration.",
    caption: "Here is a simple visual guide for what to do now.",
    source: "openai",
  });
}
