# Pulse

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

Pulse is a hackathon prototype for autonomous emergency dispatch in the first critical minute.

It captures a bystander report, classifies the emergency, anchors the incident to Acacia College at NUS, ranks nearby hospitals, places an outbound Vapi call to a configured receiving desk, tracks the call result, and starts a lightweight Adaption Labs safety-eval workflow in the background.

Live app: [https://pulse-beta-two.vercel.app](https://pulse-beta-two.vercel.app)

## What It Does

Pulse turns a bystander report into a dispatch workflow:

1. The bystander presses `Start Pulse`.
2. The browser listens with Web Speech API speech recognition.
3. The transcript is reviewed or edited in the intake box.
4. Pulse sends the transcript to the triage API.
5. OpenAI returns structured emergency classification, safety warnings, and bystander actions.
6. Google Places searches for hospitals near the hard-coded Acacia College, NUS incident location.
7. Pulse ranks hospitals by distance and starts an outbound Vapi call to the configured receiving phone number.
8. The Vapi assistant asks whether the receiving desk can accept the patient and coordinate ambulance support.
9. Pulse polls Vapi for call status, transcript, summary, and acceptance or rejection language.
10. If the call result suggests rejection, the client attempts the next ranked hospital.
11. Adaption Labs receives a small seed dataset of emergency safety scenarios when configured, otherwise Pulse shows a local fallback safety-lab result.

## Current Stack

### Application

- **Framework:** Next.js 16 App Router
- **Runtime:** React 19, TypeScript, Node.js
- **Styling:** Tailwind CSS v4 through `@tailwindcss/postcss`
- **Deployment:** Vercel
- **State:** React hooks in a single client flow

### Browser Capabilities

- Web Speech API / `webkitSpeechRecognition` for live speech-to-text
- Editable transcript fallback when microphone or speech recognition is unavailable
- Client-side timer, dispatch event timeline, hospital call panel, and safety-lab status panel

### Server Routes

| Route | Purpose |
| --- | --- |
| `POST /api/triage` | Uses OpenAI to classify the incident and return structured emergency guidance. |
| `GET /api/hospitals` | Uses Google Places to find hospitals near Acacia College, NUS, with a fixed fallback list. |
| `POST /api/dispatch/call` | Starts an outbound Vapi call to the configured receiving phone number. |
| `GET /api/dispatch/status` | Polls Vapi for call status, transcript, summary, and end reason. |
| `POST /api/adaption/safety-lab` | Uploads or simulates an emergency safety-eval dataset through Adaption Labs. |

## Demo Assumptions

This version is intentionally demo-focused.

- The incident location is hard-coded to **Acacia College, NUS**.
- The outbound call goes to `PULSE_RECEIVING_PHONE`, not directly to each hospital's listed phone number.
- Hospitals are discovered through Google Places when configured, with a baked-in Singapore fallback list.
- Safety scenarios for Adaption Labs are seed examples in the codebase.
- This is not an emergency service and must not be used as medical, clinical, or official dispatch guidance.

## Repository Structure

```text
.
├── src/app/page.tsx                         # Main Pulse client experience
├── src/app/globals.css                      # Tailwind v4 and global animation styles
├── src/app/layout.tsx                       # App metadata and shell
├── src/app/api/triage/route.ts              # OpenAI triage endpoint
├── src/app/api/hospitals/route.ts           # Google Places hospital ranking endpoint
├── src/app/api/dispatch/call/route.ts       # Vapi outbound call endpoint
├── src/app/api/dispatch/status/route.ts     # Vapi call polling endpoint
├── src/app/api/adaption/safety-lab/route.ts # Adaption Labs seed dataset endpoint
├── public/                                  # Default static assets
├── package.json
└── README.md
```

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

For a production build:

```bash
npm run lint
npm run build
npm run start
```

## How The Flow Fails Safely

Pulse has several fallback paths for demo reliability:

- If speech recognition is unavailable, the transcript box remains editable.
- If OpenAI triage fails, the client can still use local trauma-analysis logic.
- If Google Places is unavailable, the app falls back to a fixed list of nearby Singapore hospitals.
- If Adaption Labs is not configured, the safety-lab panel returns local seed scenarios instead of blocking dispatch.
- If Vapi is not configured, dispatch call creation returns a clear server error.

## Safety Notice

Pulse is a prototype. It does not replace official emergency services, hospital dispatch systems, ambulance coordination, clinical triage, or medical advice. In a real emergency, contact local emergency services immediately.
