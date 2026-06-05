# Operations

Pulse has a public bystander flow and protected internal diagnostics.

## Environment Contract

Required for the full live path:

- `OPENAI_API_KEY`
- `GOOGLE_MAPS_API_KEY` or `GOOGLE_PLACES_API_KEY`
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`
- `PULSE_COORDINATION_PHONE`
- Twilio credentials or `PULSE_MESSAGE_WEBHOOK_URL`
- `PULSE_DISPATCH_SESSION_SECRET`

Protected routes require:

- `PULSE_OPS_TOKEN`

## Deployment Checks

1. Confirm `/api/config/health` returns redacted readiness labels.
2. Confirm the public flow requires transcript review before send.
3. Confirm routine tests are mocked and do not place live calls or messages.
4. Confirm the live audit remains gated unless an intentional provider-path check is underway.

## Incident Handling

- If help is not confirmed, public UI must direct the bystander to call local emergency services.
- If provider diagnostics are needed, use protected routes only and do not copy raw transcripts into public issues.
- If credentials rotate, update deployment environment variables and never commit values.
