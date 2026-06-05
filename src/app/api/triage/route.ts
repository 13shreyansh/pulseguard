import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

type TriageResult = {
  title: string;
  emergencyType: string;
  severity: string;
  hospitalType: string;
  signals: string[];
  warning: string;
  actions: string[];
  situationSummary: string;
  doNow: string[];
  doNotDo: string[];
  watchFor: string[];
  infographicBrief: string;
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
  situationSummary: "The person may have a serious injury and should stay still while Pulse contacts help.",
  doNow: [
    "Keep the person still",
    "Press firmly on bleeding if you see blood",
    "Keep people back",
    "Watch their breathing",
  ],
  doNotDo: [
    "Do not move them unless there is danger",
    "Do not give food or drink",
    "Do not crowd around them",
  ],
  watchFor: [
    "Breathing changes",
    "Heavy bleeding",
    "Confusion or fainting",
  ],
  infographicBrief:
    "Show a calm bystander keeping an injured person still, pressing cloth on bleeding, clearing space, and watching breathing. Non-graphic, simple 3-panel emergency guide.",
  dispatchBrief:
    "Major trauma reported by bystander. Patient movement must be controlled and trauma-capable emergency care is required.",
  source: "local_fallback",
};

function fallbackResponse(reason: string) {
  return NextResponse.json({
    triage: fallbackTriage,
    source: "local_fallback",
    warning: reason,
  });
}

function cleanUserFacingText(value: string, fallback: string) {
  const cleaned = value.trim();
  return cleaned || fallback;
}

function cleanUserFacingList(values: string[], fallback: string[]) {
  const cleaned = values
    .map((value) => cleanUserFacingText(value, ""))
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned.slice(0, 4) : fallback;
}

function normalizeTriage(value: Partial<TriageResult>): TriageResult {
  const allowedEmergencyTypes = new Set([
    "MAJOR_TRAUMA",
    "CARDIAC_ARREST",
    "RESPIRATORY_DISTRESS",
    "STROKE",
    "SEVERE_BLEEDING",
    "OBSTETRIC_EMERGENCY",
    "UNKNOWN",
  ]);
  const allowedSeverities = new Set(["critical", "high", "moderate"]);
  const emergencyType = value.emergencyType && allowedEmergencyTypes.has(value.emergencyType)
    ? value.emergencyType
    : fallbackTriage.emergencyType;
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
  const rawActions = Array.isArray(value.actions) && value.actions.length > 0
    ? value.actions.slice(0, 4)
    : fallbackTriage.actions;
  const rawDoNow = Array.isArray(value.doNow) && value.doNow.length > 0
    ? value.doNow.slice(0, 4)
    : rawActions;
  const rawDoNotDo = Array.isArray(value.doNotDo) && value.doNotDo.length > 0
    ? value.doNotDo.slice(0, 4)
    : fallbackTriage.doNotDo;
  const rawWatchFor = Array.isArray(value.watchFor) && value.watchFor.length > 0
    ? value.watchFor.slice(0, 4)
    : fallbackTriage.watchFor;
  const actions = cleanUserFacingList(rawActions, fallbackTriage.actions);
  const doNow = cleanUserFacingList(rawDoNow, actions);
  const doNotDo = cleanUserFacingList(rawDoNotDo, fallbackTriage.doNotDo);
  const watchFor = cleanUserFacingList(rawWatchFor, fallbackTriage.watchFor);

  return {
    title: cleanUserFacingText(titleByType[emergencyType] || value.title || fallbackTriage.title, fallbackTriage.title),
    emergencyType,
    severity: value.severity && allowedSeverities.has(value.severity) ? value.severity : fallbackTriage.severity,
    hospitalType: hospitalByType[emergencyType] || value.hospitalType || fallbackTriage.hospitalType,
    signals: Array.isArray(value.signals) && value.signals.length > 0
      ? value.signals.slice(0, 5)
      : fallbackTriage.signals,
    warning: cleanUserFacingText(value.warning || fallbackTriage.warning, fallbackTriage.warning),
    actions,
    situationSummary: cleanUserFacingText(value.situationSummary || fallbackTriage.situationSummary, fallbackTriage.situationSummary),
    doNow,
    doNotDo,
    watchFor,
    infographicBrief: cleanUserFacingText(value.infographicBrief || fallbackTriage.infographicBrief, fallbackTriage.infographicBrief),
    dispatchBrief: value.dispatchBrief || fallbackTriage.dispatchBrief,
    source: "openai",
  };
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { name: "triage", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { transcript } = (await request.json()) as { transcript?: string };
  const cleanedTranscript = transcript?.trim();

  if (!cleanedTranscript || cleanedTranscript.length < 12) {
    return NextResponse.json({ error: "Transcript is too short" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackResponse("AI triage is unavailable; using conservative guidance.");
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
            '  "situationSummary": "one calm sentence explaining what Pulse thinks is happening",',
            '  "doNow": ["3-4 very short bystander actions"],',
            '  "doNotDo": ["3-4 very short things to avoid"],',
            '  "watchFor": ["2-4 changes the bystander should watch for"],',
            '  "infographicBrief": "one visual brief for a non-graphic 3-panel pictorial guide",',
            '  "dispatchBrief": "one concise sentence for the receiving desk"',
            "}",
            "For trauma, prioritize do-not-move guidance. For bleeding, prioritize firm direct pressure. For not breathing, mention checking breathing and hands-only CPR if needed.",
            "Write user-facing fields like a calm friend. Use simple words. Avoid technical terms like triage, dispatch, coordination, handoff, sequential, or candidate in user-facing fields.",
            "If the situation is immediately life-threatening or help is not confirmed, it is acceptable to tell the bystander to call local emergency services.",
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
    return fallbackResponse("AI triage is unavailable; using conservative guidance.");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return fallbackResponse("AI triage returned no content; using conservative guidance.");
  }

  try {
    const parsed = JSON.parse(content) as Partial<TriageResult>;
    return NextResponse.json({ triage: normalizeTriage(parsed) });
  } catch {
    return fallbackResponse("AI triage returned an unreadable response; using conservative guidance.");
  }
}
