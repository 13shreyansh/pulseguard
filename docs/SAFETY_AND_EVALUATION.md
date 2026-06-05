# Safety And Evaluation

Pulse is designed for a high-stress bystander context. The system favors calm language, conservative safety guidance, and honest status reporting over optimistic claims.

## Safety Rules

- Require GPS before intake begins.
- Show immediate actions before provider work completes.
- Keep "call local emergency services" visible when the person is in immediate danger or help is not confirmed.
- Do not ask the bystander to move a potentially injured person unless the area is unsafe.
- Do not claim hospital acceptance, ambulance dispatch, or government EMS involvement without evidence.
- Do not invent hospital names, phone numbers, or availability.

## Evaluation Surfaces

- `tests/pulse-coordination-ui.spec.ts` runs a mocked mobile flow for accepted and unconfirmed outcomes.
- `tests/pulse-prod-audit.spec.ts` checks the deployed bystander surface and records API response status evidence.
- `/api/adaption/safety-lab` builds an emergency scenario seed set and can sync it to Adaption Labs when credentials are available.
- `/api/config/health` reports redacted readiness labels without exposing secrets.
- `/api/config/vapi` provides protected call/provider diagnostics for operators.

## Scenario Coverage

The safety lab seed includes trauma, bleeding, breathing risk, head injury, cardiac risk, low-limb injury, and unconsciousness scenarios. Each scenario carries:

- a bystander-style transcript,
- an expected emergency type,
- an expected care route,
- a safety rule the response should preserve,
- and an expected response summary.

## Manual Review Checklist

- The first screen is understandable without technical context.
- Transcript confirmation appears before dispatch starts.
- The final screen clearly distinguishes accepted, not confirmed, and failed.
- Public UI does not show provider names, call IDs, internal readiness labels, or implementation jargon.
- Failure states tell the bystander what to do next.
- No live call is placed during routine mocked tests.
