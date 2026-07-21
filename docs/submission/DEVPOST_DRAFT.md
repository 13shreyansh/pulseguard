# Pulse — Devpost Submission Draft

> Submission draft only. Do not paste this into Devpost until every item marked
> `VERIFY` has been checked against the deployed production build. Never put the
> real demo access code, a phone number, provider identifier, private transcript,
> or patient data in this repository.

## Required submission fields

| Devpost field | Draft value | Final check |
| --- | --- | --- |
| Project name | **Pulse** | Confirm exact capitalization. |
| Elevator pitch | **A bystander-first incident brief that turns panic into an evidence-backed handoff to an authorized controlled dispatch desk.** | Keep the controlled-desk boundary. |
| Category | **Apps for Your Life** | Confirm the category is still available in the form. |
| Submitter type | **Individual** | User-provided fact. |
| Country of residence | **Singapore** | User-provided fact; use only if still accurate. |
| Project story | Use the draft below. | Replace every bracketed placeholder. |
| Built with | GPT-5.6, Codex, OpenAI Responses API, OpenAI Realtime API, Next.js, React, TypeScript, Vercel, Vapi, Twilio; add Google Maps only if its production request works. | List deployed technology only. Verify the exact GPT-5.6 model identifier from production. |
| Try it out | `https://savepulse.vercel.app` | Open in a signed-out browser and complete the safe typed path. |
| Source code | `https://github.com/13shreyansh/pulseguard` | Confirm it is public, licensed, and points at the deployed commit. |
| Demo video | `[PUBLIC_YOUTUBE_URL]` | Public, playable signed out, and shorter than three minutes. |
| Gallery image / thumbnail | `[FINAL_PRODUCT_COMPOSITE_PATH]` | 3:2 image made from the implemented product, not a generated UI concept. |
| Additional gallery images | `[CAPTURE_SCREENSHOT]`, `[REVIEW_SCREENSHOT]`, `[EVIDENCE_SCREENSHOT]` | Remove secrets, numbers, tokens, IDs, and private transcripts. |
| Codex feedback session ID | `[CURRENT_CODEX_FEEDBACK_SESSION_ID]` | Obtain from the current task's `/feedback` flow. |
| Private judge instructions | Use the private draft below. | Insert the code only in the private Devpost field. |

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
before anything is sent, and hand it to one authorized controlled dispatch desk.
It is designed to reduce coordination friction while preserving the boundary
between a prototype and official emergency services.

### The problem

Unstructured witness reports can omit a precise location or mix observation with
assumption. At the same time, software in an emergency domain can cause harm if it
claims that a hospital, vehicle, destination, or ETA is confirmed when nobody
actually said so.

Pulse addresses both problems. It helps the witness form a concise incident
brief, then treats the desk conversation as evidence: receipt, assignment,
destination, and ETA are separate facts, and an unknown answer stays unknown.

### What Pulse does

The user can speak or type what they observed and provide either browser location
or a Singapore address, postal code, or landmark. Nothing is sent to the
controlled desk until the user reviews the report and location.

GPT-5.6 structures the reviewed report into observations such as incident type,
consciousness, breathing, visible bleeding, number of people, and missing facts.
It does not diagnose the person or invent treatment instructions. If the model is
unavailable, the witness's reviewed words remain usable.

After explicit user confirmation and valid judge/demo access, Pulse sends the
brief to one server-configured authorized test desk and initiates one controlled
call. The final screen distinguishes brief receipt from vehicle assignment and
shows only evidence supported by the recipient's response.

For a real emergency in Singapore, the interface directs the user to call 995.
Pulse does not contact SCDF, public emergency services, a hospital, or an
ambulance provider.

### The controlled dispatch boundary

Pulse is a controlled prototype, not an emergency-service integration. The
outbound destination is fixed on the server and authorized for testing. Public
users cannot supply a phone number. A private judge/demo code gates telephony,
and dry-run mode sends no message and starts no call.

Nearby hospital information, when available from Google Maps, is advisory context
only. Pulse does not infer clinical capability, availability, hospital acceptance,
ambulance assignment, or bed capacity from a listing.

### How the user journey works

1. **Capture:** enter a location and describe observable facts by voice or text.
2. **Review:** correct the witness report and inspect the structured GPT-5.6 brief.
3. **Connect:** send the reviewed brief to the Pulse Controlled Dispatch Desk.
4. **Verify:** follow a field-by-field evidence receipt for brief delivery,
   assignment, destination, and ETA.

The interface keeps `Unknown` visible rather than turning ambiguous language into
a green success state. It also preserves a direct `Call 995` escape for real
emergencies.

### How we used GPT-5.6

`VERIFY MODEL AND DEPLOYED ROUTE BEFORE SUBMISSION.`

Pulse uses GPT-5.6 through the OpenAI Responses API with Structured Outputs for a
narrow, user-visible task: converting the reviewed witness report into a compact
observation brief. The schema favors explicit unknown values and prohibits
diagnosis, medical instructions, provider capability claims, and dispatch claims.

The controlled-call evidence path also uses GPT-5.6 to extract separate recipient
answers. Pulse then verifies that each returned evidence excerpt appears in the
recipient transcript and rejects evidence with missing or assistant-side speaker
attribution. A generic “yes” cannot populate several independent fields.

OpenAI Realtime provides optional live voice transcription. Voice audio is sent
to OpenAI only when the user chooses microphone capture; the report remains
editable before dispatch.

### How we used Codex

Shreyansh supplied the real-world problem, target context, product direction, and
authorized controlled-testing environment. Codex audited the existing repository
and production behavior, identified false-success and integration failure modes,
developed the Build Week extension, explored the visual direction, implemented
the interface and backend changes, ran browser-led QA, prepared documentation,
and produced the demo materials.

This is a human-directed, Codex-executed collaboration. It would be inaccurate to
claim that the human had no role.

### Architecture

- **Next.js and React:** mobile-first workflow and server routes.
- **OpenAI Realtime:** optional browser speech transcription.
- **GPT-5.6 Responses API:** structured observation brief and evidence extraction.
- **Google Maps:** optional nearby-place context, when production availability is
  verified.
- **Twilio/Vapi:** message and voice transport to one authorized controlled desk.
- **Signed and encrypted tokens:** bind reviewed incident data to short-lived
  dispatch and redacted status access.

`VERIFY EVERY BULLET AGAINST THE DEPLOYED BUILD.`

### Evidence instead of assumptions

The hardest product requirement was not making a call; it was representing the
call truthfully. Pulse separates provider transport status from operational
evidence. A completed call does not mean a responder was assigned. Receipt,
assignment, destination, and ETA are all independently unknown until supported by
recipient evidence.

The result screen is therefore an evidence receipt rather than a generic success
animation. Green is reserved for verified facts, amber communicates unknown or
pending information, and technical completion cannot silently become dispatch
confirmation.

### What we rebuilt during Build Week

Before the eligible period, the repository already contained a Next.js prototype
with voice/text intake, geolocation, AI triage, hospital search, configurable
messaging/calling, status polling, and an initial UI. Its last pre-extension
commit was `a83e85c` on June 5, 2026.

During Build Week, Codex and Shreyansh created a meaningful extension focused on
truthful controlled dispatch:

- `[VERIFY]` migrated the structured observation path to GPT-5.6 Responses;
- `[VERIFY]` redesigned the complete mobile and desktop interface;
- `[VERIFY]` added manual location and non-blocking care context;
- `[VERIFY]` protected outbound contact with a private demo gate;
- `[VERIFY]` made dry-run fail closed;
- `[VERIFY]` prevented transcript overwrite and stale-audio leakage;
- `[VERIFY]` replaced generic acceptance with field-specific evidence;
- `[VERIFY]` added bounded polling, refresh recovery, accessibility states, and
  production hardening;
- `[VERIFY]` added a license, accurate project documentation, real QA evidence,
  and Build Week media.

Replace this list with the final commit-backed change ledger before submission.

### Challenges

The primary challenge was designing for urgency without overstating certainty.
Speech, mapping, messaging, calling, and model responses fail independently. The
workflow had to remain understandable when location permission is denied, the
model times out, hospital search is unavailable, a call is unanswered, or the
recipient gives an ambiguous response.

A second challenge was preserving user control over transcription. A late model
or audio response must never erase a witness correction. Incident IDs, recording
IDs, cancellation boundaries, and explicit edit ownership keep stale asynchronous
work from changing the active report.

### Real user testing

`REPLACE THIS SECTION WITH COMPLETED QA LEDGER RESULTS.`

Testing is performed from the visible deployed interface across desktop and
mobile viewports. It covers typed and voice paths, location denial, microphone
denial, model and Google failures, duplicate submission, refresh recovery,
ambiguous desk evidence, keyboard navigation, VoiceOver status announcements,
reduced motion, and 200% zoom.

Narrow token and evidence-parser tests protect security invariants, but mocked DOM
flows are not presented as proof that production integrations work. No real
emergency service, hospital, ambulance provider, patient, or family member is
used in testing.

### Privacy and safety

Pulse clearly identifies when data moves between systems. Microphone audio is
streamed to OpenAI only after the user chooses voice capture. The reviewed report
and location are sent to the controlled desk only after the user presses Send.
The public result exposes only short evidence excerpts, not raw provider logs,
phone numbers, access codes, call IDs, or full transcripts.

Recording is disabled in the controlled-call configuration. Incident routes use
bounded input, short-lived tokens, fixed server-side destinations, and no-store
responses. `VERIFY THESE CONTROLS IN PRODUCTION BEFORE SUBMISSION.`

### What we learned

In an emergency-domain interface, an honest unknown is more useful than an
impressive but unsupported green checkmark. The strongest role for GPT-5.6 here
is disciplined structure and evidence extraction—not diagnosis, invented
certainty, or replacing official responders.

We also learned that the fastest path to clarity was simplifying the product to
one reviewable handoff. Optional context can enrich that handoff, but it must not
block or redefine it.

### What's next

Pulse's next step would be partnership work, not a broader public calling loop.
With appropriate clinical, legal, privacy, dispatch, and emergency-service
partners, the controlled evidence model could be evaluated against real operating
procedures. Until then, Pulse remains an explicitly controlled prototype.

## Private judge instructions

> Paste this only into Devpost's private judge-instructions field. Replace every
> placeholder immediately before submission. Never commit the real access code.

```text
Pulse is a controlled prototype. It does not contact SCDF, 995, a hospital, an
ambulance provider, a patient, or a family member. The only outbound destination
is an authorized Pulse Controlled Dispatch Desk configured by the project owner.

Production URL: https://savepulse.vercel.app
Private demo access code: [INSERT_CODE_IN_DEVPOST_ONLY]

Recommended synthetic test:
1. Open the production URL in Chrome.
2. Choose “Start controlled dispatch.”
3. Use manual location: “Marina Bay Sands, 018956”.
4. Type: “A cyclist fell near the entrance. They are awake and breathing. Their
   left arm may be injured. I cannot see severe bleeding.”
5. Review and, if needed, edit the witness report.
6. Confirm the structured observation brief keeps unstated facts as Unknown.
7. Enter the private code and press “Send to controlled desk” once.
8. Observe the progress and final evidence receipt.

Expected result: [INSERT THE EXACT VERIFIED PRODUCTION OUTCOME]. A completed call
must not be interpreted as ambulance assignment. Receipt, vehicle assignment,
destination, and ETA remain separate; unsupported fields display Unknown.

Please do not enter real patient data, try a real emergency, call 995 through this
test, or use the project to contact any person other than the configured desk.

Known production limitations: [INSERT CURRENT VERIFIED LIMITATIONS].
Tested production commit: [INSERT_SHA]
Last controlled E2E timestamp: [INSERT_TIMESTAMP_AND_TIMEZONE]
```

## Final pre-submit checklist

- [ ] No bracketed placeholder remains in a public field.
- [ ] The story matches the deployed commit.
- [ ] GPT-5.6 appears in a verified user-visible production path.
- [ ] Build Week extension commits fall inside the eligible period.
- [ ] Repository is public and includes the selected license.
- [ ] Production URL works signed out.
- [ ] YouTube video is public, signed-out playable, and under three minutes.
- [ ] Gallery images show the implemented product and expose no private data.
- [ ] Built-with tags include only deployed integrations.
- [ ] Google Maps is omitted if its production request remains unavailable.
- [ ] `/feedback` session ID is present.
- [ ] Demo code appears only in the private judge field.
- [ ] Private instructions state that only the controlled desk is contacted.
- [ ] Country, submitter type, ownership, and rules attestations are truthful.
- [ ] Final Devpost preview and saved/submitted state are captured before deadline.
