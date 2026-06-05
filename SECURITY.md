# Security

Pulse handles emergency reports, location data, call metadata, and provider credentials. Treat all of those as sensitive.

## Supported Branch

Security fixes should target `main`.

## Reporting

Do not open public issues containing secrets, private emergency reports, phone numbers, provider transcripts, or live call IDs. Use a private channel with the maintainer when sensitive evidence is required.

## Secret Handling

- Real values belong only in deployment environment variables or local `.env.local`.
- `.env.example` documents names without values.
- `.env*`, `.vercel`, `.next`, logs, test reports, and Playwright artifacts are ignored.
- Protected diagnostics require `PULSE_OPS_TOKEN`.

## Live-Service Controls

- Routine tests must not place live calls or messages.
- Production audit is disabled unless `PULSE_ALLOW_LIVE_AUDIT=true`.
- Any test that can call, text, or mutate provider configuration must be treated as an intentional operations drill.
