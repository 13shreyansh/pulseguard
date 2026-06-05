# Pulse Architecture

Pulse is built as a single Next.js App Router application. The public surface is a mobile-first bystander workflow, while call diagnostics and safety evaluation stay behind protected internal routes.

## Request Flow

```text
Start Emergency Help
  -> browser GPS lock
  -> /api/realtime/session
  -> browser microphone stream
  -> /api/speech/finalize
  -> bystander confirmation
  -> /api/triage
  -> /api/guidance/infographic
  -> /api/hospitals
  -> /api/dispatch/session
  -> /api/dispatch/call
  -> /api/dispatch/status
```

## Subsystems

- **Client experience:** `src/app/page.tsx` owns the bystander state machine, visible guidance, transcript confirmation, nearby-care display, and help-status panel.
- **Speech:** `/api/realtime/session` creates an ephemeral Realtime session; `/api/speech/finalize` improves the captured transcript before dispatch.
- **Guidance:** `/api/triage` returns structured safety actions; `/api/guidance/infographic` returns a generated image or deterministic fallback.
- **Care search:** `/api/hospitals` requires GPS coordinates, filters unsuitable places, enriches travel time when possible, and returns ranked emergency-care options.
- **Dispatch:** `/api/dispatch/session` issues a short-lived browser token after confirmation; `/api/dispatch/call` sends the incident brief before placing the live help call; `/api/dispatch/status` maps call evidence to accepted, not confirmed, or failed without exposing raw call text publicly.
- **Operations:** `/api/config/health`, `/api/config/vapi`, and `/api/adaption/safety-lab` are redacted or protected support surfaces.

## Design Principles

- The bystander sees actions, not infrastructure.
- The app never claims acceptance without evidence.
- Dynamic service failures become plain next steps, not technical errors.
- The GPS map link is sent in writing instead of relying on spoken coordinates.
- Internal diagnostics are redacted and token-protected.
