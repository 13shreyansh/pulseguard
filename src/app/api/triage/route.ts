import { NextRequest, NextResponse } from "next/server";
import { structuredResponse } from "@/lib/openai-responses";
import { rateLimit } from "@/lib/rate-limit";

export type IncidentBrief = {
  summary: string;
  incidentType: "collision" | "fall" | "medical" | "fire" | "other" | "unknown";
  consciousness: "awake" | "unresponsive" | "unknown";
  breathing: "normal" | "difficulty" | "not_breathing" | "unknown";
  visibleBleeding: "none_reported" | "present" | "severe" | "unknown";
  peopleCount: number | null;
  locationDetail: string | null;
  missingFacts: string[];
};

const incidentBriefSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 400 },
    incidentType: { type: "string", enum: ["collision", "fall", "medical", "fire", "other", "unknown"] },
    consciousness: { type: "string", enum: ["awake", "unresponsive", "unknown"] },
    breathing: { type: "string", enum: ["normal", "difficulty", "not_breathing", "unknown"] },
    visibleBleeding: { type: "string", enum: ["none_reported", "present", "severe", "unknown"] },
    peopleCount: { type: ["integer", "null"], minimum: 1, maximum: 100 },
    locationDetail: { type: ["string", "null"], maxLength: 200 },
    missingFacts: { type: "array", maxItems: 6, items: { type: "string", minLength: 1, maxLength: 100 } },
  },
  required: [
    "summary",
    "incidentType",
    "consciousness",
    "breathing",
    "visibleBleeding",
    "peopleCount",
    "locationDetail",
    "missingFacts",
  ],
};

function unavailable() {
  return NextResponse.json(
    {
      brief: null,
      source: "unavailable",
      warning: "Pulse could not structure the report. Your reviewed words can still be sent unchanged.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { name: "incident-brief", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as { report?: string; incidentId?: string } | null;
  const report = body?.report?.trim();

  if (!report || report.length < 12 || report.length > 2_000) {
    return NextResponse.json(
      { error: "Enter a witness report between 12 and 2,000 characters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await structuredResponse<IncidentBrief>({
      schemaName: "pulse_incident_brief",
      schema: incidentBriefSchema,
      safetySeed: body?.incidentId || request.headers.get("x-forwarded-for") || "pulse-incident",
      maxOutputTokens: 700,
      instructions: [
        "You structure a bystander's reviewed incident report into factual observations for an authorized controlled prototype desk.",
        "Use only facts the witness explicitly stated. Never diagnose, score severity, recommend treatment, or infer hospital capability.",
        "Do not turn unconsciousness alone into cardiac arrest. Do not turn every collision or fall into major trauma.",
        "Negated symptoms must remain negated. Use unknown or null whenever the report does not establish a fact.",
        "none_reported means the witness explicitly said there is no visible bleeding; otherwise use unknown.",
        "The summary must be concise, observational, and free of advice or unsupported conclusions.",
      ].join("\n"),
      input: `Reviewed witness report:\n${report}`,
    });

    return NextResponse.json(
      { brief: result.value, source: "openai", model: result.model },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return unavailable();
  }
}
