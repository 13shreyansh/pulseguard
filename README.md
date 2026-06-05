# Pulse Emergency

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

Pulse is a bystander-first emergency assistant for the first critical minute after an incident. It listens to a spoken report, locks live GPS, turns the report into clear safety guidance, finds nearby emergency care, shares a map-linked incident brief, places a live help call, and keeps the bystander informed without overstating what has been confirmed.

Live app: [https://pulse-beta-two.vercel.app](https://pulse-beta-two.vercel.app)

## Product Flow

1. The bystander taps `Start Emergency Help`.
2. Pulse requests precise browser location before intake begins.
3. Browser audio is transcribed in real time, then finalized with a higher-accuracy transcription pass.
4. The bystander reviews and edits what Pulse heard before anything is sent.
5. Pulse classifies the situation, surfaces simple first-aid actions, and generates a calm visual guide when image generation is available.
6. Pulse searches nearby emergency care from the locked GPS location and ranks results with travel time, distance, phone availability, and facility signals.
7. Pulse shares the incident brief with the response line, including the report, GPS map link, selected care options, and safety warning.
8. Pulse starts a live Vapi phone call and asks whether the receiving desk can take the case now.
9. Pulse polls call evidence and shows one of three honest outcomes: accepted, not confirmed, or failed.

Pulse never claims that help accepted a case unless the returned call evidence supports that outcome. If help is not confirmed, the app tells the bystander to call local emergency services and keeps the immediate safety steps visible.

## Core Capabilities

- **Speech intake:** OpenAI Realtime transcription over WebRTC plus final transcription correction.
- **Emergency understanding:** OpenAI structured triage with conservative local fallback behavior.
- **Bystander guidance:** Immediate do / do-not / watch-for actions and optional OpenAI-generated pictorial guidance.
- **Location:** Browser GPS with broad-location rejection and map-link handoff.
- **Care discovery:** Google Places Nearby Search with Distance Matrix enrichment when available.
- **Messaging:** Twilio SMS or a signed HTTPS message webhook for the incident package.
- **Live call:** Vapi outbound calling through the configured response line.
- **Evidence tracking:** Status polling maps call evidence into accepted, not confirmed, or failed.
- **Internal safety lab:** Protected Adaption Labs route for emergency scenario evaluation.

## Architecture

```text
Bystander
  -> GPS lock
  -> realtime speech
  -> final transcript review
  -> structured triage
  -> pictorial guidance
  -> hospital search and ranking
  -> incident message
  -> live help call
  -> evidence-based status
```

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## API Surface

| Route | Purpose |
| --- | --- |
| `POST /api/realtime/session` | Creates an ephemeral OpenAI Realtime transcription session for browser audio. |
| `POST /api/speech/finalize` | Runs the final transcription pass over captured browser audio. |
| `POST /api/triage` | Returns structured emergency classification and bystander guidance. |
| `POST /api/guidance/infographic` | Generates a calm pictorial guide with a safe fallback. |
| `GET /api/hospitals?lat={lat}&lng={lng}` | Searches and ranks nearby emergency care from GPS coordinates. |
| `POST /api/dispatch/call` | Shares the incident package and starts the live help call. |
| `GET /api/dispatch/status` | Polls phone-call evidence and facility-response status. |
| `GET /api/config/health` | Returns redacted readiness labels for the app shell. |
| `GET/POST /api/config/vapi` | Protected provider diagnostics for operators only. |
| `POST /api/adaption/safety-lab` | Protected emergency scenario evaluation route. |

## Environment

Create `.env.local` from `.env.example`.

```bash
cp .env.example .env.local
```

Required for the full live path:

- `OPENAI_API_KEY`
- `GOOGLE_MAPS_API_KEY` or `GOOGLE_PLACES_API_KEY`
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`
- `PULSE_COORDINATION_PHONE` or legacy `PULSE_OPERATOR_PHONE`
- Twilio credentials or `PULSE_MESSAGE_WEBHOOK_URL`

Recommended production defaults:

```bash
PULSE_CALL_PROVIDER=vapi
PULSE_REQUIRE_INTERACTIVE_CALL=true
PULSE_DISPATCH_MODE=live
```

Protected operator routes require:

```bash
PULSE_OPS_TOKEN=
```

Do not commit real values. `.env*` files are ignored except `.env.example`.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run build
npm run test:mocked
```

Optional live audit:

```bash
npm run test:prod-audit
```

The production audit can exercise live services. Run it only when intentionally checking the deployed path.

## Safety And Product Boundaries

- Pulse is a prototype emergency assistant, not a replacement for official emergency services, hospital dispatch systems, ambulance coordination, clinical triage, or medical advice.
- GPS is required before intake so the incident brief can include a usable map link.
- Hospital names shown in the UI come from live Google Maps/Places search. Pulse does not invent care locations.
- If hospital search, messaging, or calling cannot complete, the app fails plainly and tells the bystander to call local emergency services.
- Internal provider diagnostics and safety tooling are protected by `PULSE_OPS_TOKEN` and are not part of the public bystander flow.

More detail: [docs/SAFETY_AND_EVALUATION.md](docs/SAFETY_AND_EVALUATION.md)

## Demo Script

Use the short walkthrough in [docs/DEMO.md](docs/DEMO.md) for screenshots, video capture, or live presentation.
