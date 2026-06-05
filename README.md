# Pulse Emergency

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

Pulse is an emergency coordination app for the first critical minute after an incident. It captures a bystander report, requires live GPS, classifies the emergency, shows immediate bystander guidance, ranks nearby hospital candidates, sends the GPS/map incident brief by message, and starts a sequential facility-coordination call through the configured Pulse demo line.

Live app: [https://pulse-beta-two.vercel.app](https://pulse-beta-two.vercel.app)

## What It Does

1. The bystander presses `Start Pulse`.
2. Pulse requests precise browser GPS.
3. Pulse starts OpenAI Realtime transcription over WebRTC and keeps the transcript editable.
4. The transcript is sent to the triage API for structured emergency classification and immediate bystander guidance.
5. `/api/hospitals` searches Google Places around the GPS location and ranks candidates by travel time when available, distance, facility signal, phone availability, and confidence.
6. Pulse builds one coordination session with contact targets, facility questions, call attempts, bystander guidance, selected destination, and a handoff timeline.
7. Pulse sends the incident package by SMS or message webhook to the configured coordination line.
8. Pulse places one real Vapi call for the first selected hospital candidate through the configured demo line, asking facility availability and ambulance-handoff questions.
9. Pulse polls Vapi for call status, transcript, summary, and handoff evidence.

Hackathon v1 is intentionally sequential because only one number is configured. Pulse does not claim a hospital accepted the patient unless the call evidence confirms acceptance. If acceptance is not confirmed, the UI tells the bystander to call local emergency services and marks the handoff as unresolved.

## Current Stack

- **Framework:** Next.js App Router
- **UI:** React 19, TypeScript, Tailwind CSS v4
- **Speech:** OpenAI Realtime transcription over WebRTC
- **Location:** Browser `navigator.geolocation`
- **Triage:** OpenAI API with local conservative logic for resilience
- **Hospital Search:** Google Places Nearby Search plus Distance Matrix travel-time enrichment when available
- **Messaging:** Twilio SMS or a configured HTTPS message webhook to the coordination line
- **Dispatch Calls:** Vapi outbound call API routed to `PULSE_COORDINATION_PHONE` / `PULSE_OPERATOR_PHONE`
- **Internal Evaluation:** Adaption Labs route remains available as an internal QA endpoint only
- **Deployment:** Vercel

## API Surface

| Route | Purpose |
| --- | --- |
| `POST /api/realtime/session` | Creates an ephemeral OpenAI Realtime transcription session for browser audio. |
| `POST /api/speech/finalize` | Runs a higher-accuracy final transcription pass over the captured browser audio. |
| `POST /api/triage` | Classifies the incident with OpenAI and returns structured emergency guidance. |
| `POST /api/guidance/infographic` | Generates a calm pictorial bystander guide, with safe fallback UI if image generation is unavailable. |
| `GET /api/hospitals?lat={lat}&lng={lng}` | Searches and ranks nearby hospital candidates from the provided GPS coordinates. |
| `POST /api/dispatch/call` | Sends the coordination brief, starts the sequential Vapi call, and returns a `coordinationSession`. |
| `GET /api/dispatch/status` | Polls Vapi/Twilio for call status, transcript, summary, handoff status, and facility-response evidence. |
| `GET /api/config/health` | Returns integration readiness labels for the app shell. |
| `POST /api/adaption/safety-lab` | Internal emergency evaluation dataset route. Not shown in the user flow. |

### Hospital Search Contract

`GET /api/hospitals` requires:

- `lat`: incident latitude
- `lng`: incident longitude

Optional:

- `radiusMeters`: search radius, default `15000`

Response shape:

```ts
{
  incidentLocation: {
    label: "Current GPS location";
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  hospitals: Array<{
    id: string;
    name: string;
    address: string;
    phone?: string;
    distanceKm: number;
    travelTimeMinutes?: number;
    score: number;
    confidence: "high" | "medium" | "low";
    rankingReason: string;
    mapsUrl: string;
    source: "google_places";
  }>;
  source: "google_places" | "unavailable";
  warning?: string;
}
```

## Production Truth

- GPS is required before intake starts.
- Hospital names shown in the UI come from Google Maps/Places search using the locked GPS coordinates.
- Pulse does not use hardcoded hospital names or local hospital seed data. If Google hospital search is unavailable, dispatch fails plainly instead of inventing candidates.
- The GPS coordinates and map URL are sent by message instead of relying on a spoken coordinate string.
- Hackathon v1 routes sequential facility coordination through the configured demo line. It models the selected hospital candidate and facility questions without pretending a real hospital accepted unless call evidence confirms it.
- Internal provider status, local resilience paths, and evaluation tooling are not presented as user-facing emergency features.

## Environment

Create `.env.local` in the project root.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-realtime-whisper
OPENAI_REALTIME_TRANSCRIPTION_DELAY=low
OPENAI_FINAL_TRANSCRIPTION_MODEL=gpt-4o-transcribe
OPENAI_IMAGE_MODEL=gpt-image-2

VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
PULSE_CALL_PROVIDER=vapi
# Optional: use a saved, dashboard-tested Vapi assistant instead of a transient assistant.
PULSE_VAPI_ASSISTANT_ID=
PULSE_VAPI_USE_SAVED_ASSISTANT=
PULSE_VAPI_MODEL=gpt-4o-mini
PULSE_VAPI_VOICE_ID=Elliot
PULSE_VAPI_RING_TIMEOUT_SECONDS=180
PULSE_VAPI_MAX_DURATION_SECONDS=300
PULSE_REQUIRE_INTERACTIVE_CALL=true
PULSE_COORDINATION_PHONE=
PULSE_OPERATOR_PHONE=
# Legacy alias still accepted during migration:
PULSE_RECEIVING_PHONE=

TWILIO_ACCOUNT_SID=
# Optional preferred scoped credentials:
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
# Optional alias:
SMS_FROM_NUMBER=

# Optional alternative to Twilio. Receives a JSON incident payload.
PULSE_MESSAGE_WEBHOOK_URL=
PULSE_MESSAGE_WEBHOOK_TOKEN=

# Use dry_run locally only when you need verification without placing a phone call.
PULSE_DISPATCH_MODE=live
# Production ignores dry_run unless this escape hatch is explicitly set.
PULSE_ALLOW_DRY_RUN_IN_PRODUCTION=

GOOGLE_MAPS_API_KEY=
# Optional alternative used by the hospital endpoint:
GOOGLE_PLACES_API_KEY=

ADAPTION_LABS_API_KEY=
# Optional legacy alias:
ADAPTION_API_KEY=
# Required to access internal evaluation endpoints in production:
PULSE_OPS_TOKEN=
```

The local `.env.local` file is ignored by Git. If the project is linked to Vercel, pull production secrets with:

```bash
vercel env pull .env.local --environment=production --yes
```

For production, configure `PULSE_COORDINATION_PHONE` (or the legacy `PULSE_OPERATOR_PHONE`), Google Maps/Places, OpenAI, Vapi, and either Twilio credentials or `PULSE_MESSAGE_WEBHOOK_URL`. `PULSE_CALL_PROVIDER` defaults to `vapi`; keep it there for an interactive GPT phone conversation. Twilio Voice alone is a real one-way alert call, so Pulse blocks that path while `PULSE_REQUIRE_INTERACTIVE_CALL=true`. When `PULSE_DISPATCH_MODE` is unset or set to `live`, Pulse requires the incident brief message to be sent before it places the coordination call. If `PULSE_DISPATCH_MODE=dry_run` is accidentally set in Vercel, production still runs live unless `PULSE_ALLOW_DRY_RUN_IN_PRODUCTION=true` is also set.

For international destinations such as Singapore numbers, the Vapi phone number must be an imported or paid number that supports international outbound calling. A free US-only Vapi number will not complete those calls.

Internal Vapi readiness can be checked with `GET /api/config/vapi` using `Authorization: Bearer $PULSE_OPS_TOKEN`. It redacts phone numbers and never returns API keys.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production check:

```bash
npm run lint
npm run build
```

## Repository Structure

```text
.
├── src/app/page.tsx                         # Main Pulse client experience
├── src/app/globals.css                      # Tailwind v4 and global styles
├── src/app/layout.tsx                       # App metadata and shell
├── src/app/api/realtime/session/route.ts    # OpenAI Realtime transcription session endpoint
├── src/app/api/triage/route.ts              # OpenAI triage endpoint
├── src/app/api/hospitals/route.ts           # GPS-based Google Places hospital ranking endpoint
├── src/app/api/dispatch/call/route.ts       # Coordination session and Vapi call endpoint
├── src/app/api/dispatch/status/route.ts     # Vapi/Twilio handoff polling endpoint
├── src/app/api/adaption/safety-lab/route.ts # Internal evaluation dataset endpoint
├── public/
├── package.json
└── README.md
```

## Safety Notice

Pulse is a prototype. It does not replace official emergency services, hospital dispatch systems, ambulance coordination, clinical triage, or medical advice. In a real emergency, contact local emergency services immediately.
