# Contributing

Pulse is an emergency-domain product, so changes should be small, reviewed, and verified against safety behavior before they are merged.

## Local Verification

Run the standard checks before opening a pull request:

```bash
npm run lint
npm run build
npm run test:mocked
```

`npm run test:prod-audit` is intentionally gated. It must not place live calls or messages unless `PULSE_ALLOW_LIVE_AUDIT=true` is set for a deliberate production validation.

## Change Rules

- Keep public language calm, direct, and free of implementation jargon.
- Do not commit secrets, private reports, real phone numbers, `.env.local`, `.vercel`, `.next`, logs, Playwright output, or provider transcripts.
- Treat any change that can trigger messages, webhooks, or calls as safety-sensitive.
- Keep routine tests mocked and non-side-effectful.
- Prefer focused changes over broad refactors.

## Review Checklist

- Transcript review still happens before message or call actions.
- Unconfirmed help never appears as accepted.
- Failure states tell the bystander what to do next.
- Internal diagnostics remain protected by `PULSE_OPS_TOKEN`.
- Documentation reflects actual runtime behavior.
