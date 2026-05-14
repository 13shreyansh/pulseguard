import { NextRequest, NextResponse } from "next/server";

type TriageResult = {
  title: string;
  emergencyType: string;
  severity: string;
  hospitalType: string;
  signals: string[];
  warning: string;
  actions: string[];
  dispatchBrief: string;
  source: "openai" | "local_fallback";
};

const fallbackTriage: TriageResult = {
  title: "Major trauma detected",
  emergencyType: "MAJOR_TRAUMA",
  severity: "high",
  hospitalType: "Trauma-capable emergency care required",
  signals: [
    "Impact injury reported",
    "Bleeding status requires attention",
    "Movement risk needs control",
    "Trauma-capable emergency care required",
  ],
  warning: "Do not move the patient unless there is immediate danger.",
  actions: [
    "Stop people from moving him",
    "Apply firm pressure to bleeding",
    "Keep him still and awake",
    "Watch breathing",
  ],
  dispatchBrief:
    "Major trauma reported by bystander. Patient movement must be controlled and trauma-capable emergency care is required.",
  source: "local_fallback",
};

function normalizeTriage(value: Partial<TriageResult>): TriageResult {
  const emergencyType = value.emergencyType || fallbackTriage.emergencyType;
  const titleByType: Record<string, string> = {
    MAJOR_TRAUMA: "Major trauma detected",
    CARDIAC_ARREST: "Cardiac arrest risk detected",
    RESPIRATORY_DISTRESS: "Respiratory distress detected",
    STROKE: "Stroke symptoms detected",
    SEVERE_BLEEDING: "Severe bleeding detected",
    OBSTETRIC_EMERGENCY: "Obstetric emergency detected",
    UNKNOWN: "Emergency details need clarification",
  };
  const hospitalByType: Record<string, string> = {
    MAJOR_TRAUMA: "Trauma-capable emergency care required",
    CARDIAC_ARREST: "Cardiac-ready emergency department required",
    RESPIRATORY_DISTRESS: "Emergency department with airway support required",
    STROKE: "Stroke-capable emergency care required",
    SEVERE_BLEEDING: "Emergency department with trauma support required",
    OBSTETRIC_EMERGENCY: "Maternity emergency care required",
    UNKNOWN: "Emergency department required",
  };
  const actions = Array.isArray(value.actions) && value.actions.length > 0
    ? value.actions
        .map((action) =>
          /call emergency|call ambulance|dial emergency/i.test(action)
            ? "Keep space clear for responders"
            : action,
        )
        .slice(0, 4)
    : fallbackTriage.actions;

  return {
    title: titleByType[emergencyType] || value.title || fallbackTriage.title,
    emergencyType,
    severity: value.severity || fallbackTriage.severity,
    hospitalType: hospitalByType[emergencyType] || value.hospitalType || fallbackTriage.hospitalType,
    signals: Array.isArray(value.signals) && value.signals.length > 0
      ? value.signals.slice(0, 5)
      : fallbackTriage.signals,
    warning: value.warning || fallbackTriage.warning,
    actions,
    dispatchBrief: value.dispatchBrief || fallbackTriage.dispatchBrief,
    source: "openai",
  };
}

export async function POST(request: NextRequest) {
  const { transcript } = (await request.json()) as { transcript?: string };
  const cleanedTranscript = transcript?.trim();

  if (!cleanedTranscript || cleanedTranscript.length < 12) {
    return NextResponse.json({ error: "Transcript is too short" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are Pulse, an emergency dispatch triage assistant.",
            "Return only valid JSON. Do not include confidence scores.",
            "Do not invent advanced medical treatment. Give conservative bystander actions only.",
            "Use this exact JSON shape:",
            "{",
            '  "title": "short visible triage title",',
            '  "emergencyType": "MAJOR_TRAUMA | CARDIAC_ARREST | RESPIRATORY_DISTRESS | STROKE | SEVERE_BLEEDING | OBSTETRIC_EMERGENCY | UNKNOWN",',
            '  "severity": "critical | high | moderate",',
            '  "hospitalType": "short receiving-facility requirement",',
            '  "signals": ["3-5 short extracted emergency signals"],',
            '  "warning": "one urgent safety warning for the bystander",',
            '  "actions": ["exactly 4 short bystander actions"],',
            '  "dispatchBrief": "one concise sentence for the receiving desk"',
            "}",
            "For trauma, prioritize do-not-move guidance. For bleeding, prioritize firm direct pressure. For not breathing, mention checking breathing and hands-only CPR if needed.",
            "Do not include 'call emergency services' as a bystander action because Pulse is already coordinating dispatch in the product flow.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Bystander emergency report:\n${cleanedTranscript}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "OpenAI triage failed", details: errorText.slice(0, 300) },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json({ error: "OpenAI response was empty" }, { status: 502 });
  }

  try {
    const parsed = JSON.parse(content) as Partial<TriageResult>;
    return NextResponse.json({ triage: normalizeTriage(parsed) });
  } catch {
    return NextResponse.json({ error: "OpenAI response was not valid JSON" }, { status: 502 });
  }
}
