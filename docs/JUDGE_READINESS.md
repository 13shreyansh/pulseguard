# Judge Readiness

Pulse should be evaluated as a bystander-first emergency assistant with real service integrations and conservative public status reporting.

## Product Truth

- Pulse captures a bystander report, locks location, finalizes the transcript, and asks the bystander to review it before help-contact actions begin.
- Pulse searches nearby emergency care and prepares a map-linked incident brief from that location.
- The live help-contact path is routed through the configured response line for the deployment. The selected care destination and nearby options are included in the brief and visible status.
- Pulse does not claim acceptance unless call evidence is normalized to an accepted handoff state.
- If help is unconfirmed or failed, Pulse keeps local-emergency-services guidance visible.

## Safety Evidence

- Public dispatch requires a short-lived session token and cooldown.
- Public status responses are redacted and normalized.
- Routine tests are mocked and cannot place live calls or messages.
- Production audit is explicitly gated by `PULSE_ALLOW_LIVE_AUDIT=true`.
- Protected diagnostics require `PULSE_OPS_TOKEN`.

## Verification Evidence

Use these commands for routine review:

```bash
npm run lint
npm run build
npm run test:mocked
npm run test:prod-audit
```

Expected routine result:

- lint passes,
- build passes,
- mocked tests pass,
- production audit reports one skipped test unless the live audit gate is enabled.

## Known Boundaries

- Pulse is not official emergency services and does not replace calling the local emergency number.
- Live provider drills must be intentional and controlled.
- Real credentials are never committed; `.env.example` is the public contract.
