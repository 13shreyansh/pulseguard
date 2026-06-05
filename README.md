# Pulse Emergency

<p align="center">
  <img src="public/pulse-emergency-logo-512.png" alt="Pulse Emergency logo" width="140" />
</p>

<p align="center">
  <strong>Bystander-first emergency guidance, location handoff, nearby-care discovery, and evidence-based help-contact status for the first critical minute.</strong>
</p>

<p align="center">
  <a href="https://pulse-beta-two.vercel.app"><strong>Live App</strong></a>
  ·
  <a href="docs/DEMO.md">Demo Script</a>
  ·
  <a href="docs/ARCHITECTURE.md">Architecture</a>
  ·
  <a href="docs/SAFETY_AND_EVALUATION.md">Safety</a>
  ·
  <a href="docs/JUDGE_READINESS.md">Judge Readiness</a>
</p>

<p align="center">
  <a href="https://github.com/13shreyansh/pulseguard/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/13shreyansh/pulseguard/actions/workflows/ci.yml/badge.svg" />
  </a>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vercel" src="https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel" />
</p>

## Table Of Contents

- [Why Pulse Exists](#why-pulse-exists)
- [What Pulse Does](#what-pulse-does)
- [Live Product Flow](#live-product-flow)
- [System Architecture](#system-architecture)
- [AI And Provider Stack](#ai-and-provider-stack)
- [Safety And Truth Guarantees](#safety-and-truth-guarantees)
- [API Surface](#api-surface)
- [Local Setup](#local-setup)
- [Environment Contract](#environment-contract)
- [Verification](#verification)
- [Deployment](#deployment)
- [Operations](#operations)
- [Repository Quality Evidence](#repository-quality-evidence)
- [Known Boundaries](#known-boundaries)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Why Pulse Exists

Emergency apps often ask a stressed bystander to make too many decisions too early: explain the incident perfectly, choose where to go, call multiple people, share location, and remember first-aid steps. Pulse is built around a different product principle:

> The bystander should get immediate, calm guidance first. Coordination and provider work should happen in the background, and the UI should only claim what is actually confirmed.

Pulse focuses on the first critical minute after an incident. It listens to what happened, locks the browser location, turns the report into simple actions, searches nearby emergency care, prepares a map-linked incident brief, contacts the configured response line, and reports whether help was accepted, unconfirmed, or failed.

Live app: [https://pulse-beta-two.vercel.app](https://pulse-beta-two.vercel.app)

Repository: [https://github.com/13shreyansh/pulseguard](https://github.com/13shreyansh/pulseguard)

## What Pulse Does

Pulse combines a public bystander flow with protected internal diagnostics.

| Capability | What It Means |
| --- | --- |
| Bystander intake | The user can speak or type what happened in plain language. |
| Location lock | Browser GPS is requested before intake so the help brief can include a usable map link. |
| Realtime speech | OpenAI Realtime transcription captures live speech while the user speaks. |
| Final transcript | Captured browser audio is finalized through a second transcription pass when available. |
| Review before send | Nothing is shared or called until the bystander confirms the report. |
| Emergency understanding | Structured triage converts the report into severity, warning, do-now steps, avoid steps, and watch-for signals. |
| Visual guidance | A calm pictorial guide is generated when image generation is available, with deterministic fallback UI. |
| Nearby-care discovery | Google Maps/Places and travel-time signals rank emergency-care options near the locked location. |
| Incident brief | The report, location, map link, selected care option, and safety warning are sent to the configured response line. |
| Live help contact | Vapi/Twilio-backed calling contacts the configured response line for the deployment. |
| Evidence-based status | Public status is normalized into accepted, not confirmed, or failed without exposing raw transcripts. |
| Protected diagnostics | Operational checks and safety lab routes are protected by `PULSE_OPS_TOKEN`. |

## Live Product Flow

```text
Start Emergency Help
  -> Lock browser location
  -> Start realtime speech capture
  -> Finalize transcript from captured audio
  -> Bystander reviews and edits the report
  -> Generate structured triage and safety guidance
  -> Generate or fall back to pictorial guidance
  -> Search and rank nearby emergency care
  -> Issue short-lived dispatch session token
  -> Send map-linked incident brief to response line
  -> Start live help-contact call
  -> Poll redacted status evidence
  -> Show accepted, not confirmed, or failed
```

### User-Facing States

1. **Start**: simple emergency-first landing view with immediate safety reminder.
2. **Listen**: speech or typed report with clear location and microphone state.
3. **Review**: final report confirmation before any message or call action.
4. **Sending**: immediate guidance remains visible while backend work runs.
5. **Done**: final status is one of:
   - `accepted`: call evidence supports that help can receive the case,
   - `not_confirmed`: the call did not produce a clear yes,
   - `failed`: the call or message path failed.

Pulse never tells the user that help is ready unless returned call evidence supports that result. If help is unconfirmed or failed, the UI keeps local-emergency-services guidance visible.

## System Architecture

Pulse is a Next.js 16 App Router application with public bystander routes and protected operations routes.

```text
Browser
  |-- public client UI
  |-- WebRTC speech stream
  |-- geolocation
  |
Next.js App Router
  |-- /api/realtime/session
  |-- /api/speech/finalize
  |-- /api/triage
  |-- /api/guidance/infographic
  |-- /api/hospitals
  |-- /api/dispatch/session
  |-- /api/dispatch/call
  |-- /api/dispatch/status
  |-- protected /api/config/*
  |-- protected /api/adaption/safety-lab
  |
External Services
  |-- OpenAI Realtime + transcription + structured triage + image generation
  |-- Google Maps/Places + Distance Matrix
  |-- Twilio SMS / voice
  |-- Vapi outbound calling
  |-- optional signed message webhook
```

Primary code paths:

- Public UI: [src/app/page.tsx](src/app/page.tsx)
- Dispatch call route: [src/app/api/dispatch/call/route.ts](src/app/api/dispatch/call/route.ts)
- Dispatch status route: [src/app/api/dispatch/status/route.ts](src/app/api/dispatch/status/route.ts)
- Handoff inference: [src/lib/handoff.ts](src/lib/handoff.ts)
- Dispatch session guard: [src/lib/dispatch-session.ts](src/lib/dispatch-session.ts)
- Nearby-care search: [src/app/api/hospitals/route.ts](src/app/api/hospitals/route.ts)
- Triage route: [src/app/api/triage/route.ts](src/app/api/triage/route.ts)

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## AI And Provider Stack

| Layer | Implementation |
| --- | --- |
| App framework | Next.js 16 App Router |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Speech intake | OpenAI Realtime transcription over WebRTC |
| Final transcription | OpenAI audio transcription endpoint |
| Emergency reasoning | OpenAI JSON-mode structured triage with conservative fallback |
| Pictorial guidance | OpenAI image generation with deterministic fallback |
| Nearby-care search | Google Maps/Places and optional travel-time enrichment |
| Message path | Twilio SMS or signed HTTPS webhook |
| Live call path | Vapi or Twilio, routed through deployment response line |
| Hosting | Vercel |
| Verification | ESLint, Next production build, Playwright mocked product flow |

## Safety And Truth Guarantees

Pulse is built for a high-stress emergency domain, so the repository prioritizes conservative claims and explicit boundaries.

### Product Safety

- GPS is requested before intake begins.
- Transcript review is required before message or call actions.
- Public dispatch requires a short-lived session token.
- Public dispatch has a browser/IP cooldown.
- Public status responses are normalized and redacted.
- Public UI avoids internal service names, call IDs, readiness labels, and implementation jargon.
- Unconfirmed handoff states do not render as accepted.
- Routine tests cannot place live calls or messages.
- Production audit is skipped unless `PULSE_ALLOW_LIVE_AUDIT=true`.

### Bystander Safety

- Pulse keeps immediate actions visible while background work runs.
- The UI says to call local emergency services when danger is immediate or help is not confirmed.
- The system does not invent care locations.
- The system does not claim ambulance dispatch, government EMS involvement, or hospital acceptance unless evidence supports it.
- The response line path is deployment-configured and documented as such.

### Protected Internal Surfaces

- `/api/config/vapi` requires `PULSE_OPS_TOKEN`.
- `/api/adaption/safety-lab` requires `PULSE_OPS_TOKEN`.
- Protected diagnostics are for maintainers, not the public bystander flow.

More detail: [docs/SAFETY_AND_EVALUATION.md](docs/SAFETY_AND_EVALUATION.md)

## API Surface

| Route | Method | Access | Purpose |
| --- | --- | --- | --- |
| `/api/realtime/session` | `POST` | Public | Creates an ephemeral OpenAI Realtime transcription session for browser audio. |
| `/api/speech/finalize` | `POST` | Public | Runs final transcription over captured browser audio. |
| `/api/triage` | `POST` | Public | Returns structured emergency classification and bystander guidance. |
| `/api/guidance/infographic` | `POST` | Public | Generates a calm pictorial guide or fallback result. |
| `/api/hospitals?lat={lat}&lng={lng}` | `GET` | Public | Searches and ranks nearby emergency-care options. |
| `/api/dispatch/session` | `POST` | Public | Issues a short-lived dispatch session token after review. |
| `/api/dispatch/call` | `POST` | Public + token | Sends the incident brief and starts the live help-contact path. |
| `/api/dispatch/status?callId={id}` | `GET` | Public status | Returns normalized, redacted call status. |
| `/api/config/health` | `GET` | Public redacted | Returns readiness labels without secrets. |
| `/api/config/vapi` | `GET/POST` | Protected | Provider diagnostics and controlled operations checks. |
| `/api/adaption/safety-lab` | `GET/POST` | Protected | Emergency scenario evaluation seed and optional sync. |

## Local Setup

### Requirements

- Node.js 22 recommended for parity with CI.
- npm.
- Browser with microphone and geolocation permissions for local manual testing.

### Install

```bash
npm ci
```

### Configure

```bash
cp .env.example .env.local
```

Fill only the values needed for the path you are testing. Do not commit `.env.local`.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Contract

### Core Variables

| Variable | Required For | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | Speech, triage, images | Required for AI-backed path. |
| `OPENAI_MODEL` | Triage | Defaults are documented in `.env.example`. |
| `OPENAI_REALTIME_TRANSCRIPTION_MODEL` | Realtime speech | Use a realtime transcription-compatible model. |
| `OPENAI_FINAL_TRANSCRIPTION_MODEL` | Final transcript | Used by `/api/speech/finalize`. |
| `OPENAI_IMAGE_MODEL` | Pictorial guidance | Fallback UI is used if unavailable. |
| `GOOGLE_MAPS_API_KEY` or `GOOGLE_PLACES_API_KEY` | Nearby-care search | Used by `/api/hospitals`. |
| `VAPI_API_KEY` | Vapi calls | Required for Vapi live path. |
| `VAPI_PHONE_NUMBER_ID` | Vapi calls | Must match the active configured Vapi phone number. |
| `PULSE_COORDINATION_PHONE` | Live response line | Primary response-line destination. |
| `PULSE_OPERATOR_PHONE` | Legacy fallback | Still accepted during migration. |
| `PULSE_RECEIVING_PHONE` | Legacy fallback | Still accepted during migration. |
| `PULSE_DISPATCH_SESSION_SECRET` | Dispatch token signing | Strongly recommended in production. |
| `PULSE_OPS_TOKEN` | Protected diagnostics | Required for internal operations routes. |

### Messaging Variables

Use one of these paths:

| Path | Variables |
| --- | --- |
| Twilio SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID` or `TWILIO_AUTH_TOKEN`, `TWILIO_API_KEY_SECRET`, `TWILIO_FROM_NUMBER` or `SMS_FROM_NUMBER` |
| Message webhook | `PULSE_MESSAGE_WEBHOOK_URL`, optional `PULSE_MESSAGE_WEBHOOK_TOKEN` |

### Recommended Production Defaults

```bash
PULSE_CALL_PROVIDER=vapi
PULSE_REQUIRE_INTERACTIVE_CALL=true
PULSE_DISPATCH_MODE=live
```

### Live Audit Gate

```bash
PULSE_ALLOW_LIVE_AUDIT=true
```

Only set this when deliberately validating the deployed live-service path.

## Verification

### Routine Verification

```bash
npm run lint
npm run build
npm run test:mocked
npm run test:prod-audit
```

Expected routine result:

- lint passes,
- production build passes,
- mocked product tests pass,
- production audit reports one skipped test unless `PULSE_ALLOW_LIVE_AUDIT=true`.

### What The Mocked Tests Prove

- The mobile bystander flow reaches accepted help evidence.
- The mobile bystander flow does not overstate unconfirmed help.
- Dispatch is not called before transcript review confirmation.
- Rejection phrases such as `not available`, `full`, and `try another` do not become accepted.
- Explicit receive confirmation can become accepted.
- In-flight and failed call states remain distinct.

### Secret Hygiene Check

```bash
rg -n \
  -e "sk-[A-Za-z0-9_-]{20,}" \
  -e "(OPENAI_API_KEY|VAPI_API_KEY|TWILIO_AUTH_TOKEN|TWILIO_API_KEY_SECRET|PULSE_OPS_TOKEN|PULSE_DISPATCH_SESSION_SECRET)\s*=\s*[^\s#]+" \
  --glob '!node_modules/**' \
  --glob '!.git/**' \
  --glob '!.next/**' \
  --glob '!test-results/**' \
  --glob '!playwright-report/**' \
  --glob '!package-lock.json' \
  .
```

No matches should be returned.

## Deployment

Pulse is designed for Vercel deployment.

1. Set environment variables in the deployment dashboard.
2. Keep real secrets out of the repository.
3. Use `PULSE_DISPATCH_MODE=live` for the full live path.
4. Keep `PULSE_REQUIRE_INTERACTIVE_CALL=true` when the deployment should require interactive calling.
5. Verify `/api/config/health` returns redacted readiness labels.
6. Run routine checks locally or through GitHub Actions before release.
7. Run live audit only as a controlled operation.

CI is defined in [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Operations

Operational review lives in [docs/OPERATIONS.md](docs/OPERATIONS.md).

Key rules:

- Protected routes require `PULSE_OPS_TOKEN`.
- Do not copy raw provider transcripts into public issues.
- Do not run live provider checks accidentally.
- Treat any call, text, webhook, or provider mutation as an intentional operations drill.
- If credentials rotate, update deployment environment variables only.

## Repository Quality Evidence

| Evidence | File |
| --- | --- |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Safety and evaluation | [docs/SAFETY_AND_EVALUATION.md](docs/SAFETY_AND_EVALUATION.md) |
| Testing | [docs/TESTING.md](docs/TESTING.md) |
| Operations | [docs/OPERATIONS.md](docs/OPERATIONS.md) |
| Production readiness | [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) |
| Judge readiness | [docs/JUDGE_READINESS.md](docs/JUDGE_READINESS.md) |
| Security | [SECURITY.md](SECURITY.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Pull request checklist | [.github/pull_request_template.md](.github/pull_request_template.md) |
| CI workflow | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| Issue templates | [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE) |

## Known Boundaries

Pulse is an emergency-domain assistant, not official emergency services.

- It does not replace calling the local emergency number.
- It does not claim ambulance dispatch.
- It does not invent hospital availability.
- It does not expose raw call transcripts through the public status route.
- It depends on deployment configuration for the response line and provider credentials.
- Live provider tests must be intentional and controlled.

## Project Structure

```text
.
├── .github/
│   ├── workflows/ci.yml
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEMO.md
│   ├── JUDGE_READINESS.md
│   ├── OPERATIONS.md
│   ├── PRODUCTION_READINESS.md
│   ├── SAFETY_AND_EVALUATION.md
│   └── TESTING.md
├── public/
│   └── pulse-emergency-logo-512.png
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── dispatch-session.ts
│       ├── handoff.ts
│       └── response-line.ts
├── tests/
│   ├── handoff-inference.spec.ts
│   ├── pulse-coordination-ui.spec.ts
│   └── pulse-prod-audit.spec.ts
├── CONTRIBUTING.md
├── SECURITY.md
├── README.md
├── package.json
└── playwright.config.ts
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Before opening a pull request:

```bash
npm run lint
npm run build
npm run test:mocked
```

Safety-sensitive changes should explain:

- whether public copy changed,
- whether any path can place live calls or messages,
- whether status wording can overclaim acceptance,
- whether any private data or credentials are exposed,
- and how the change was verified.
