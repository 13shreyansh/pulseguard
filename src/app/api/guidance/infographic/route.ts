import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

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
    caption: triage?.situationSummary || "Follow the steps on screen while Pulse contacts help.",
    source: "fallback",
  });
}

function isBackgroundHelpInstruction(value: string) {
  const lower = value.toLowerCase();
  const contactWords = /\b(call|dial|phone|contact|notify|alert|message|text|send|share)\b/.test(lower);
  const helpWords =
    /\b(help|emergency|ambulance|hospital|service|services|responder|responders|dispatcher|dispatch|family|police|fire)\b/.test(
      lower,
    );

  return contactWords && helpWords;
}

function imageSafeText(value: string | undefined, fallback: string) {
  if (!value) return fallback;

  const cleaned = value
    .replace(/\bcall(?:ing)?\s+(?:local\s+)?emergency services\b/gi, "Pulse contacts emergency help")
    .replace(/\bcall(?:ing)?\s+(?:an\s+)?ambulance\b/gi, "Pulse contacts ambulance support")
    .replace(/\bcall(?:ing)?\s+(?:for\s+)?help\b/gi, "Pulse contacts help")
    .replace(/\bcontact(?:ing)?\s+(?:local\s+)?emergency services\b/gi, "Pulse contacts emergency help")
    .replace(/\bphone(?:ing)?\s+(?:an\s+)?ambulance\b/gi, "Pulse contacts ambulance support")
    .replace(/\bmessage(?:ing)?\s+(?:the\s+)?location\b/gi, "Pulse shares the location")
    .replace(/\bshare(?:d|s|ing)?\s+(?:the\s+)?location\b/gi, "Pulse shares the location")
    .trim();

  return cleaned || fallback;
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { name: "guidance-image", limit: 6, windowMs: 5 * 60_000 });
  if (limited) return limited;

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

  const rawActions = (body.triage.doNow?.length ? body.triage.doNow : body.triage.actions || []).slice(0, 6);
  const actions = rawActions.filter((action) => !isBackgroundHelpInstruction(action)).slice(0, 4);
  const avoid = (body.triage.doNotDo || []).slice(0, 4);
  const watch = (body.triage.watchFor || []).slice(0, 3);
  const situation = imageSafeText(
    body.triage.situationSummary || body.triage.title,
    "Emergency reported by a bystander",
  );
  const visualBrief = imageSafeText(
    body.triage.infographicBrief,
    "Show calm on-scene bystander safety steps while Pulse contacts help in the background.",
  );
  const onSceneActions = actions.length
    ? actions
    : ["Stay with the person", "Keep the space clear", "Keep the person still if injury is possible"];
  const prompt = [
    "Create a calm, non-graphic emergency bystander pictorial guide for the waiting period while Pulse contacts help in the background.",
    "Style: warm public-safety illustration, soft colors, simple people, no blood detail, no gore, no panic, no tiny text.",
    "Layout: 3 clear panels showing only practical on-scene actions the bystander can do near the person. Leave clean open space for app text overlays.",
    `Situation: ${situation}.`,
    `Visual brief: ${visualBrief}`,
    `Show these on-scene actions visually: ${onSceneActions.join("; ")}.`,
    avoid.length ? `Avoid showing these as recommended actions: ${avoid.join("; ")}.` : null,
    watch.length ? `Subtly suggest watching for: ${watch.join("; ")}.` : null,
    "Do not show calling, dialing, phones, ambulance request buttons, emergency-number text, hospital contact screens, or a person making a phone call.",
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
    caption: "Here is a simple visual guide for what to do while Pulse contacts help.",
    source: "openai",
  });
}
