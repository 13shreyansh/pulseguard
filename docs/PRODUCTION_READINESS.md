# Production Readiness

This document tracks the repository evidence that Pulse is built as a serious emergency-domain product.

## Current Guarantees

- GPS is requested before intake begins.
- Final transcript review happens before message or call actions.
- Public dispatch requires a short-lived browser session token and cooldown.
- Call status shown publicly is normalized and redacted.
- Routine browser tests are mocked and non-side-effectful.
- Production audit is disabled unless explicitly enabled.
- Internal diagnostics are protected by `PULSE_OPS_TOKEN`.

## Known Operating Boundaries

- Pulse is not a replacement for official emergency services.
- The response line must be configured deliberately for the deployment region.
- Live provider checks must be treated as operations drills.
- Emergency-domain copy must stay plain, calm, and evidence-based.

## Release Checklist

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test:mocked`
- [ ] Secret-pattern scan
- [ ] `.env.example` matches deployment contract
- [ ] Public UI avoids internal implementation language
- [ ] Production audit gate confirmed
