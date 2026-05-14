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
  source?: "openai" | "local_fallback";
};

type DispatchRequest = {
  transcript?: string;
  triage?: TriageResult;
  incidentLocation?: {
    label: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  } | null;
  hospital?: {
    name: string;
    address?: string;
    phone?: string;
    distanceKm?: number;
    source?: "google_places" | "fallback";
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

  const hospitalName = body.hospital?.name || "the selected hospital";
  const locationLabel = body.incidentLocation?.label || "Current GPS location";
  const coordinateLine =
    body.incidentLocation?.latitude != null && body.incidentLocation?.longitude != null
      ? `GPS coordinates: ${body.incidentLocation.latitude.toFixed(5)}, ${body.incidentLocation.longitude.toFixed(5)}.`
      : null;
  const accuracyLine =
    body.incidentLocation?.accuracy != null
      ? `GPS accuracy: approximately ${Math.round(body.incidentLocation.accuracy)} meters.`
      : null;
  const hospitalPhoneLine = body.hospital?.phone
    ? `Google Places hospital phone: ${body.hospital.phone}. Do not dial it in this test-mode call.`
    : "Google Places did not return a hospital phone number.";
  const locationLine = [
    `Incident location: ${locationLabel}.`,
    coordinateLine,
    accuracyLine,
    "Use the readable place name and GPS coordinates in conversation.",
  ].filter(Boolean).join(" ");

  const firstMessage =
    `Hello, this is Pulse Emergency Dispatch calling the configured test receiver for ${hospitalName}. Can you role-play the receiving desk?`;

  const systemPrompt = [
    "You are Pulse Emergency Dispatch. This call is routed to a configured test receiver, not directly to the hospital phone number.",
    "The receiver is expected to role-play a receiving desk for the selected hospital.",
    "Speak calmly and professionally. Do not claim to be government emergency services.",
    "Keep the conversation short, structured, and under 45 seconds.",
    "Ask exactly one question at a time, then wait for the receiver's answer.",
    "Do not combine the opening test-receiver confirmation question with the emergency brief.",
    "Do not repeat words such as 'can can' or 'or or'.",
    `Selected receiving hospital: ${hospitalName}.`,
    body.hospital?.address ? `Hospital address: ${body.hospital.address}.` : null,
    body.hospital?.distanceKm != null ? `Approximate distance from scene: ${body.hospital.distanceKm} kilometers.` : null,
    body.hospital?.source ? `Hospital data source: ${body.hospital.source}.` : null,
    hospitalPhoneLine,
    `Emergency type: ${body.triage.emergencyType}. Severity: ${body.triage.severity}.`,
    body.triage.source ? `Triage data source: ${body.triage.source}.` : null,
    `Required care: ${body.triage.hospitalType}.`,
    `Dispatch brief: ${body.triage.dispatchBrief}.`,
    `Bystander report: ${transcript}.`,
    locationLine,
    `Bystander warning already shown: ${body.triage.warning}.`,
    "Call flow:",
    "1. Opening question has already been spoken. Wait for confirmation that the test receiver can role-play the receiving desk for the selected hospital.",
    "2. If they say they cannot role-play the correct desk or selected hospital, politely say Pulse will try the next selected hospital scenario and end the call.",
    "3. If they confirm, give the emergency brief in one or two sentences. Mention the incident location, emergency type, key injury signals, and warning.",
    `Example brief style: We have a bystander report near ${locationLabel}: ${body.triage.dispatchBrief} The bystander has been told: ${body.triage.warning}`,
    `4. After the brief, ask this exact question: Can ${hospitalName} receive this patient and send or coordinate an ambulance to ${locationLabel} now?`,
    "5. Wait for the answer.",
    "6. If they say yes, say: Thank you. Pulse has delivered the incident brief. Please prepare to receive the patient and coordinate ambulance dispatch. Goodbye.",
    "7. If they say no, cannot receive, unavailable, full, or cannot coordinate ambulance support, say: Understood. Pulse will try the next selected hospital scenario. Goodbye.",
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
    callTarget: "test_receiver",
    selectedHospitalPhone: body.hospital?.phone,
  });
}
