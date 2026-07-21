# Pulse — Devpost Submission Draft

> Submission draft. Implemented code and production health facts are resolved
> below. Public video and final Devpost submission remain pending. Never put the real
> demo access code, a phone number, provider identifier, private transcript, or
> patient data in this repository.

## Required submission fields

| Devpost field | Draft value | Final check |
| --- | --- | --- |
| Project name | **Pulse** | Confirm exact capitalization. |
| Elevator pitch | **A bystander-first incident brief that turns panic into a reviewable, evidence-aware controlled handoff.** | Keep the controlled-prototype boundary. |
| Category | **Apps for Your Life** | Confirm the category remains available in the form. |
| Submitter type | **Individual** | User-provided fact. |
| Country of residence | **Singapore** | User-provided fact; use only if still accurate. |
| Project story | Use the resolved draft below. | Update only the pending release artifacts. |
| Built with | GPT-5.6, Codex, OpenAI Responses API, OpenAI Realtime API, Next.js, React, TypeScript, Vercel, Vapi, Twilio | Google Maps is omitted because its production query is unavailable. Vapi/Twilio are implemented and health-verified but inactive in production verification-only mode. |
| Try it out | `https://savepulse.vercel.app` | Complete the safe typed production path signed out. |
| Source code | `https://github.com/13shreyansh/pulseguard` | Public, MIT-licensed, deployed application `e7e4bd9`. |
| Demo video | `[PUBLIC_YOUTUBE_URL]` | Pending: public, playable signed out, and shorter than three minutes. |
| Gallery image / thumbnail | `docs/screenshots/devpost-thumbnail-3x2.png` | 3:2 composite made from the implemented production product. |
| Additional gallery images | `production-capture-desktop.png`, `production-review-gpt56.png`, `production-result-verification.png` | Actual production screens; no secrets, numbers, tokens, IDs, or private transcripts. |
| Codex feedback session ID | `019f703a-a871-7022-8096-498e8d54d8dc` | Current project task where the core Build Week extension was built. |
| Private judge instructions | Use the private draft below. | Put the code only in Devpost's private field. |

Also complete any Devpost-required account, eligibility, rules, or ownership
attestations using only facts the user can truthfully attest. Do not infer an
answer from this draft. If the form introduces a new legal representation,
identity check, CAPTCHA, payment, or phone verification, pause on that field.

## Project story

### Inspiration

In the first minutes after an accident, a bystander can face several urgent
questions at once: Should I stay with the person? What details should I report?
Who should I call? How do I explain the location? The result is often not a lack
of willingness to help, but confusion at the moment when clarity matters most.

Pulse explores a focused idea: help a witness capture a clear account, review it
before any handoff, and preserve the difference between an observation, a
transport event, and verified operational evidence. It is designed to reduce
coordination friction without pretending to be an official emergency service.

### The problem

Unstructured witness reports can omit a precise location or mix observation with
assumption. Emergency-domain software creates another risk when a delivered
message, completed call, or generic “yes” becomes an unsupported claim that a
vehicle, destination, or ETA was confirmed.

Pulse addresses both problems. It helps the witness form a concise incident
brief, then keeps receipt, assignment, destination, and ETA as separate facts.
Unknown stays unknown.

### What Pulse does

The user can speak or type what they observed and provide either browser location
or a Singapore address, postal code, or landmark. The witness report stays
editable before the final confirmation.

GPT-5.6 structures the reviewed report into observations such as incident type,
consciousness, breathing, visible bleeding, number of people, and missing facts.
It does not diagnose the person or invent treatment instructions. If the model is
unavailable, the witness's reviewed words remain usable.

The live-capable implementation accepts only one fixed, server-side, authorized
Singapore `+65` controlled-desk destination and protects the operation with a
private code and an incident-bound token. The current production deployment is
deliberately **verification-only** because the existing configured destination
did not pass that Singapore authorization check. It sends no SMS or webhook and
starts no call. Its terminal receipt says that no desk contact was made and keeps
every unsupported field `Unknown`.

For a real emergency in Singapore, the interface directs the user to call 995.
Pulse does not contact SCDF, public emergency services, a hospital, an ambulance
provider, a patient, or a family member.

### The controlled dispatch boundary

Pulse is a controlled prototype, not an emergency-service integration. Public
users cannot supply a destination number. A private judge/demo code gates the
final operation, the server validates a Singapore-format fixed destination, and
`dry_run` sends no message, webhook, or call.

Vapi and Twilio passed non-mutating production health probes, but provider
configuration is not evidence that an outbound operation occurred. No production
message or call was made for this release.

Nearby hospital context is optional. The Google production query is currently
unavailable, so the UI shows an honest non-blocking unavailable state. Pulse does
not infer clinical capability, availability, hospital acceptance, ambulance
assignment, or bed capacity from a listing.

### How the user journey works

1. **Capture:** enter a location and describe observable facts by voice or text.
2. **Review:** correct the witness report and inspect the structured GPT-5.6 brief.
3. **Authorize:** confirm the incident-bound package through the private demo gate.
4. **Verify:** in this production release, reach a no-contact terminal receipt in
   which receipt, assignment, destination, and ETA remain `Unknown`.

The interface also preserves a direct `Call 995` escape for real emergencies.

### How we used GPT-5.6

Pulse uses GPT-5.6 through the OpenAI Responses API with Structured Outputs for a
narrow, user-visible task: converting the reviewed witness report into a compact
observation brief. The schema favors explicit unknown values and prohibits
diagnosis, medical instructions, provider capability claims, and dispatch claims.
Production health and the visible production journey verified the GPT-5.6
integration. The observation brief reported the exact model `gpt-5.6-sol`.

The code also contains a live-mode evidence path that uses GPT-5.6 to extract
separate recipient answers, then verifies exact recipient-side excerpts and
speaker attribution. A generic “yes” cannot populate several independent fields.
That live path was not exercised in this release because there is no authorized
Singapore-format desk destination.

OpenAI Realtime provides optional live voice transcription. Voice audio is sent
to OpenAI only when the user chooses microphone capture; the report remains
editable before the final operation.

### How we used Codex

Shreyansh supplied the real-world problem, target context, product direction, and
controlled-testing boundary. Codex audited the existing repository and
production behavior, identified false-success and integration failure modes,
developed the Build Week extension, explored the visual direction, implemented
the interface and backend changes, ran local browser-led QA, prepared
documentation, and prepared the demo materials.

This is a human-directed, Codex-executed collaboration. It would be inaccurate to
claim that the human had no role.

### Architecture

- **Next.js and React:** mobile-first workflow and server routes.
- **OpenAI Realtime:** optional browser speech transcription.
- **GPT-5.6 Responses API:** structured observation brief and live-mode evidence extraction.
- **Twilio/Vapi:** fixed-destination transport adapters; production health-verified but inactive while verification-only mode is enabled.
- **Signed and encrypted tokens:** bind reviewed incident data to short-lived authorization and redacted status access.
- **Google context:** optional and non-blocking; currently unavailable in production and omitted from Built with tags.

### Evidence instead of assumptions

The hardest product requirement was not making a call; it was representing every
state truthfully. Pulse separates provider transport status from operational
evidence. A completed call would not mean a responder was assigned. Receipt,
assignment, destination, and ETA remain independently unknown until supported by
recipient evidence.

The current production result demonstrates the same discipline from the opposite
direction: because outbound contact is disabled, it explicitly says no desk
contact occurred and leaves every evidence field unknown.

### What we rebuilt during Build Week

Before the eligible period, the repository already contained a Next.js prototype
with voice/text intake, geolocation, AI triage, hospital search, configurable
messaging/calling, status polling, and an initial UI. Its last pre-extension
commit was `a83e85c` on June 5, 2026.

During Build Week, Codex and Shreyansh created a meaningful extension focused on
truthful controlled dispatch:

- migrated the structured observation path to GPT-5.6 Responses;
- redesigned the complete mobile and desktop interface;
- added manual location and non-blocking care context;
- protected the final operation with a private demo gate and incident-bound token;
- made dry-run fail closed before any SMS, webhook, or call;
- prevented transcript overwrite and stale-audio leakage;
- replaced generic acceptance with field-specific evidence validation;
- added bounded polling, refresh recovery, accessibility states, and production hardening;
- added an MIT license, accurate project documentation, a QA ledger, and Build Week media plans.

The eligible-period backend commit is `047c79d`, the interface commit is
`782a2a4`, the documentation commit is `f73d0cc`, and application commit
`e7e4bd9` is deployed.

### Challenges

The primary challenge was designing for urgency without overstating certainty.
Speech, mapping, transport, and model responses fail independently. The workflow
had to remain understandable when location permission is denied, the model times
out, hospital search is unavailable, or the safe destination gate rejects an
unapproved line.

A second challenge was preserving user control over transcription. A late model
or audio response must never erase a witness correction. Incident IDs, recording
IDs, cancellation boundaries, and explicit edit ownership keep stale asynchronous
work from changing the active report.

### Real user testing

Visible production QA covered the manual-location and typed-report path, witness
edit persistence, a user-visible `gpt-5.6-sol` brief, Google unavailable state,
private-code gate, verification-only completion, deliberate double activation,
keyboard focus, and responsive layouts at desktop, 390×844, and 320×568. The
manual/typed journey passed without horizontal loss, and every unsupported
evidence field remained `Unknown`.

Production health separately verified GPT-5.6, Realtime, Vapi, and Twilio while
reporting Google unavailable and the controlled desk fail-closed. Chrome's native
microphone permission prompt remained pending, so the voice path is documented
as blocked rather than presented as passed. Lint, production build, and six
narrow token/evidence safeguards also passed. Mocked DOM flows are not presented
as production proof.

### Privacy and safety

Pulse identifies when data moves between systems. Microphone audio is streamed to
OpenAI only after the user chooses voice capture. In the current verification-only
release, the reviewed package reaches Pulse's server after confirmation but is not
sent to messaging or calling providers. Public responses expose no phone number,
access code, call ID, provider log, or full transcript.

The live-capable call configuration disables recording. Incident routes use
bounded input, short-lived tokens, fixed server-side destinations, no-store
responses, and a fail-closed Singapore destination check.

### What we learned

In an emergency-domain interface, an honest unknown is more useful than an
impressive but unsupported green checkmark. The strongest role for GPT-5.6 here
is disciplined structure and evidence extraction—not diagnosis, invented
certainty, or replacing official responders.

We also learned that refusing an unapproved destination is a successful safety
outcome. A deadline is not a reason to route a test call outside the declared
Singapore boundary.

### What's next

Pulse's next step is partnership work, not a broader public calling loop. An
authorized Singapore controlled desk would be required before live transport is
enabled. With appropriate clinical, legal, privacy, dispatch, and
emergency-service partners, the evidence model could then be evaluated against
real operating procedures.

## Private judge instructions

> Paste this only into Devpost's private judge-instructions field. Insert the
> private code immediately before submission. Never commit the code.

```text
Pulse is a controlled prototype. It does not contact SCDF, 995, a hospital, an
ambulance provider, a patient, or a family member.

Production URL: https://savepulse.vercel.app
Private demo access code: [INSERT_CODE_IN_DEVPOST_ONLY]
Production mode: verification-only; no SMS, webhook, or call is sent.

Recommended synthetic test:
1. Open the production URL in Chrome.
2. Choose “Start controlled verification.”
3. Use manual location: “Marina Bay Sands, 018956”.
4. Type: “A cyclist fell near the entrance. They are awake and breathing. Their
   left arm may be injured. I cannot see severe bleeding.”
5. Review and, if needed, edit the witness report.
6. Confirm the structured observation brief keeps unstated facts as Unknown.
7. Enter the private code and run the final operation once.
8. Confirm the result says no desk contact was made and receipt, vehicle
   assignment, destination, and ETA are all Unknown.

Expected result: verification-only completion. No message, webhook, or call is
sent. This release has no authorized Singapore-format controlled-desk destination.

Please do not enter real patient data or try a real emergency. Use the direct 995
escape for a real Singapore emergency.

Known production limitations: Google hospital context is unavailable; live
controlled-desk transport is disabled; Chrome's microphone permission remained
pending during production QA.
Tested production commit: e7e4bd9
Last visible production E2E: July 22, 2026, approximately 01:10–01:14 IST
```

## Final pre-submit checklist

- [x] Visible production typed/manual path and GPT-5.6 brief are recorded in the QA ledger.
- [x] Build Week extension commits fall inside the eligible period.
- [x] Repository is public and includes the MIT license.
- [x] Production serves application commit `e7e4bd9`.
- [x] Production is verification-only and does not claim a live desk operation.
- [ ] YouTube video is public, signed-out playable, and under three minutes.
- [x] Gallery images show the implemented product and expose no private data.
- [x] Built-with draft omits Google Maps while its production request is unavailable.
- [x] `/feedback` session ID is present.
- [ ] Demo code appears only in the private judge field.
- [x] Private instructions describe the no-contact production result.
- [ ] Country, submitter type, ownership, and rules attestations are confirmed in Devpost.
- [ ] Final Devpost preview and saved/submitted state are captured before the deadline.
