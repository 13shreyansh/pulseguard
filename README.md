# Pulse Emergency

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

Pulse is a real-time emergency dispatch prototype for the first critical minute after an incident. It captures a bystander report, requires the browser's live GPS position, classifies the emergency, finds nearby hospitals from Google Places, and routes a Vapi test-mode call to a configured receiver with the selected hospital context.

Live app: [https://pulse-beta-two.vercel.app](https://pulse-beta-two.vercel.app)

## What It Does

1. The bystander presses `Start Pulse`.
2. Pulse requests browser GPS with high accuracy enabled.
3. If location permission is denied or times out, the intake flow stays blocked with a clear location-required message.
4. The browser listens with Web Speech API speech recognition, with an editable transcript fallback.
5. The transcript is sent to the triage API for structured emergency classification and bystander guidance.
6. `/api/hospitals` searches Google Places around the actual GPS coordinates and ranks hospitals by computed distance.
7. Pulse selects a hospital candidate and calls `PULSE_RECEIVING_PHONE`, the configured test receiver.
8. The Vapi assistant clearly states that the call is a test-mode call for the selected hospital scenario.
9. Pulse polls Vapi for call status, transcript, summary, and acceptance or rejection language.
10. If the receiver rejects the scenario, Pulse attempts the next selected hospital candidate.
11. The safety-lab route syncs an emergency evaluation dataset to Adaption Labs when configured, or returns a visible local result.

## Current Stack

- **Framework:** Next.js App Router
- **UI:** React 19, TypeScript, Tailwind CSS v4
- **Speech:** Browser Web Speech API / `webkitSpeechRecognition`
- **Location:** Browser `navigator.geolocation`
- **Triage:** OpenAI API, with explicit local fallback
- **Hospital Search:** Google Places Nearby Search, with explicit fallback data
- **Dispatch Calls:** Vapi outbound call API, routed to `PULSE_RECEIVING_PHONE`
- **Safety Evaluation:** Adaption Labs API, with explicit local fallback
- **Deployment:** Vercel

## API Surface

| Route | Purpose |
| --- | --- |
| `POST /api/triage` | Classifies the incident with OpenAI and returns structured emergency guidance. Fallback triage is marked `local_fallback`. |
| `GET /api/hospitals?lat={lat}&lng={lng}` | Searches Google Places near the provided GPS coordinates. Missing or invalid coordinates return `400`. |
| `POST /api/dispatch/call` | Starts a Vapi call to the configured test receiver, not directly to the hospital phone number. |
| `GET /api/dispatch/status` | Polls Vapi for call status, transcript, summary, and end reason. |
| `POST /api/adaption/safety-lab` | Uploads or simulates an emergency safety-eval dataset through Adaption Labs. |

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
    source: "google_places" | "fallback";
  }>;
  source: "google_places" | "fallback";
  warning?: string;
}
```

## Real Data And Fallbacks

Pulse now separates live data from fallback data instead of presenting demo data as real:

- GPS is required before intake starts.
- Hospital search uses the user's real GPS coordinates.
- Hospital distances are computed from the current GPS location.
- Google Places results are marked `google_places`.
- Hospital fallback results are marked `fallback` and shown with a visible fallback badge.
- Triage fallback results are marked `local_fallback`.
- Safety-lab local results are marked `local`.
- Dispatch still calls the configured test receiver. Real hospital phone calls are intentionally out of scope until the call target is changed.

## Environment

Create `.env.local` in the project root.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
PULSE_RECEIVING_PHONE=

GOOGLE_MAPS_API_KEY=
# Optional alternative used by the hospital endpoint:
GOOGLE_PLACES_API_KEY=

ADAPTION_LABS_API_KEY=
# Optional legacy alias:
ADAPTION_API_KEY=
```

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
├── src/app/api/triage/route.ts              # OpenAI triage endpoint
├── src/app/api/hospitals/route.ts           # GPS-based Google Places hospital endpoint
├── src/app/api/dispatch/call/route.ts       # Vapi test receiver call endpoint
├── src/app/api/dispatch/status/route.ts     # Vapi call polling endpoint
├── src/app/api/adaption/safety-lab/route.ts # Adaption Labs safety dataset endpoint
├── public/
├── package.json
└── README.md
```

## Safety Notice

Pulse is a prototype. It does not replace official emergency services, hospital dispatch systems, ambulance coordination, clinical triage, or medical advice. In a real emergency, contact local emergency services immediately.
