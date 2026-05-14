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
};

type DispatchRequest = {
  transcript?: string;
  triage?: TriageResult;
  incidentLocation?: {
    label: string;
  } | null;
  hospital?: {
    name: string;
    address?: string;
    distanceKm?: number;
  } | null;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as DispatchRequest;
  const transcript = body.transcript?.trim();

  if (!transcript || !body.triage) {
    return NextResponse.json({ error: "Transcript and triage are required" }, { status: 400 });
  }

  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const receivingPhone = process.env.PULSE_RECEIVING_PHONE;

  if (!apiKey || !phoneNumberId || !receivingPhone) {
    return NextResponse.json({ error: "Vapi dispatch is not configured" }, { status: 500 });
  }

  const hospitalName = body.hospital?.name || "the selected receiving hospital";
  const locationLabel =
    body.incidentLocation?.label || "Acacia College, NUS";
  const locationLine = `Incident location: ${locationLabel}. Use this readable place name in conversation and do not mention raw coordinates.`;

  const firstMessage =
    `Hello, this is Pulse Emergency Dispatch. Am I speaking with the receiving desk for ${hospitalName}?`;

  const systemPrompt = [
    "You are Pulse Emergency Dispatch. You are calling a configured receiving desk for an emergency-response intake call.",
    "Speak calmly and professionally. Do not claim to be government emergency services.",
    "Keep the conversation short, structured, and under 45 seconds.",
    "Ask exactly one question at a time, then wait for the receiver's answer.",
    "Do not combine the opening desk-confirmation question with the emergency brief.",
    "Do not repeat words such as 'can can' or 'or or'.",
    `Selected receiving hospital: ${hospitalName}.`,
    body.hospital?.address ? `Hospital address: ${body.hospital.address}.` : null,
    body.hospital?.distanceKm != null ? `Approximate distance from scene: ${body.hospital.distanceKm} kilometers.` : null,
    `Emergency type: ${body.triage.emergencyType}. Severity: ${body.triage.severity}.`,
    `Required care: ${body.triage.hospitalType}.`,
    `Dispatch brief: ${body.triage.dispatchBrief}.`,
    `Bystander report: ${transcript}.`,
    locationLine,
    `Bystander warning already shown: ${body.triage.warning}.`,
    "Call flow:",
    "1. Opening question has already been spoken. Wait for confirmation that this is the receiving desk for the selected hospital.",
    "2. If they say this is not the correct desk or not the selected hospital, politely say Pulse will call the next nearest hospital and end the call.",
    "3. If they confirm the desk, give the emergency brief in one or two sentences. Mention the incident location, emergency type, key injury signals, and warning.",
    `Example brief style: We have a bystander report near ${locationLabel}: ${body.triage.dispatchBrief} The bystander has been told: ${body.triage.warning}`,
    `4. After the brief, ask this exact question: Can ${hospitalName} receive this patient and send or coordinate an ambulance to ${locationLabel} now?`,
    "5. Wait for the answer.",
    "6. If they say yes, say: Thank you. Pulse has delivered the incident brief. Please prepare to receive the patient and coordinate ambulance dispatch. Goodbye.",
    "7. If they say no, cannot receive, unavailable, full, or cannot coordinate ambulance support, say: Understood. Pulse will call the next nearest hospital. Goodbye.",
    "Never say that Pulse is dispatching or detaching an ambulance itself. Pulse only asks the hospital to send or coordinate one.",
    "Do not ask them to confirm the hospital name after they already say yes.",
    "Do not provide complex medical instructions.",
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId,
      customer: {
        number: receivingPhone,
      },
      assistant: {
        name: "Pulse Dispatch",
        firstMessage,
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.2,
        },
        voice: {
          provider: "vapi",
          voiceId: "Elliot",
        },
        maxDurationSeconds: 90,
        recordingEnabled: true,
        endCallMessage: "Pulse Emergency Dispatch ending the call now. Thank you.",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Vapi call failed", details: errorText.slice(0, 500) },
      { status: 502 },
    );
  }

  const call = (await response.json()) as {
    id?: string;
    status?: string;
  };

  return NextResponse.json({
    callId: call.id,
    status: call.status || "queued",
    receivingPhone,
  });
}
