# Testing

Pulse separates routine verification from intentional live-service checks.

## Routine Checks

```bash
npm run lint
npm run build
npm run test:mocked
```

`npm run test:mocked` runs the mobile bystander flow with mocked service responses and focused handoff inference tests. Playwright starts a local Next.js dev server automatically unless `PULSE_TEST_BASE_URL` is already set.

## Production Audit

```bash
PULSE_ALLOW_LIVE_AUDIT=true npm run test:prod-audit
```

The production audit is skipped by default. Run it only when deliberately validating the deployed path and live-service destination.

## Evidence Expectations

- Accepted help requires explicit confirmation evidence.
- Rejection phrases such as "not available," "full," and "try another" must remain unconfirmed.
- Public UI should not expose internal service names, raw call IDs, readiness labels, or implementation jargon.
