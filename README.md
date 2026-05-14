# Pulse

Autonomous emergency dispatch for the first critical minute.

Pulse captures a bystander voice report, performs emergency triage, finds nearby hospitals around Acacia College, NUS, places an outbound Vapi call, asks whether the facility can receive the patient and coordinate an ambulance, and starts an Adaption Labs safety-eval run in the background.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Required Environment

Create `.env.local` with:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
VAPI_CALLER_NUMBER=
PULSE_RECEIVING_PHONE=
GOOGLE_MAPS_API_KEY=
ADAPTION_API_KEY=
ADAPTION_LABS_API_KEY=
```

## Demo Flow

1. Press `Start Pulse`.
2. Speak the incident report.
3. Click `Process Now`.
4. Pulse triages the report, shows bystander guidance, ranks hospitals, and starts the dispatch call.
5. Adaption Labs syncs the safety dataset and starts a background eval-data run without blocking dispatch.

## Safety Note

Pulse is a hackathon prototype and does not replace official emergency services or clinical guidance.

## Scripts

```bash
npm run lint
npm run build
```
