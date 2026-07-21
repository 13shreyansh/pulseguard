# Pulse — Build Week Extension Record

> This document separates the pre-existing Pulse prototype from the meaningful
> extension created during the OpenAI Build Week eligibility period. Implemented
> and deployed work is commit-backed below; visible production E2E, video, and
> Devpost completion remain pending.

## Eligibility baseline

Repository history establishes the pre-extension baseline:

| Baseline fact | Evidence |
| --- | --- |
| Repository | `https://github.com/13shreyansh/pulseguard` |
| Last pre-extension commit | `a83e85c` — `Harden public API safety boundaries` |
| Commit timestamp | June 5, 2026, 21:23:04 IST |
| Audit branch start | `main` at `a83e85c` |
| Build Week implementation branch | `codex/build-week-controlled-dispatch` |
| Extension work began | July 22, 2026 IST |

Do not rewrite, backdate, or otherwise alter commit history to imply that older
work was created during Build Week.

## What existed before Build Week

The June 5 baseline already contained:

- a Next.js 16 / React 19 web application;
- a bystander landing and incident flow;
- browser geolocation;
- OpenAI Realtime voice transcription and final audio transcription;
- an editable report review step;
- legacy OpenAI JSON-mode triage and generated guidance;
- Google-based nearby hospital search;
- server-configured messaging and Vapi/Twilio calling routes;
- signed dispatch-session and encrypted public-status tokens;
- provider-status polling and an accepted/not-confirmed/failed UI;
- operations, testing, architecture, and readiness documentation;
- mocked Playwright product-flow tests and a gated production-audit test.

This baseline was substantial, but the July 22 audit found that it was not a
working or truthful Build Week submission:

- production Singapore hospital search returned unavailable;
- the production dispatch-session secret was missing;
- no application route used GPT-5.6;
- the selected hospital was not the configured call destination;
- generic affirmative language could overconfirm several unsupported facts;
- dry-run could still send a message;
- GPS was a hard gate;
- transcription and audio lifecycle had stale-update risks;
- several UI and README claims overstated location sharing, privacy, provider
  capability, or help confirmation;
- the production deployment and all commits predated the eligible period;
- the public repository had no license.

## Build Week extension objective

The extension changes Pulse from a broad emergency-help prototype into one
explicitly controlled workflow:

> A bystander captures what happened, reviews every detail, and sends a structured
> incident brief to an authorized controlled dispatch desk. GPT-5.6 organizes the
> report. Pulse displays only outcomes supported by explicit desk evidence.

Pulse remains a prototype. It does not contact SCDF, public emergency services, a
hospital, an ambulance provider, a patient, or a family member. The current
production release is verification-only: the existing configured destination did
not pass the required Singapore `+65` authorization check, so production sends no
SMS or webhook and starts no call.

## Change ledger

Update each row only after implementation, review, and a supporting commit exist.

| Area | Build Week change | Status | Commit / evidence |
| --- | --- | --- | --- |
| Product boundary | Replace the broad help flow with one Controlled Dispatch journey and persistent Singapore 995 escape | `COMPLETE` | `782a2a4` |
| GPT-5.6 | Use GPT-5.6 Responses with Structured Outputs for a user-visible observation brief | `COMPLETE` | `047c79d` |
| Model behavior | Remove diagnosis/prescription output and preserve explicit unknown observations | `COMPLETE` | `047c79d`; safeguard suite |
| Voice integrity | Prevent late transcription overwrite, stale audio, and orphaned microphone tracks | `COMPLETE` | `782a2a4`; local visible QA |
| Location | Add manual Singapore address/postal-code/landmark input; make GPS optional | `COMPLETE` | `782a2a4`; local visible QA |
| Hospital context | Make Google data optional and remove capability/availability inference | `COMPLETE` | `047c79d`; local unavailable-state QA |
| Dispatch target enforcement | Accept only a fixed, server-configured, authorized Singapore `+65` Pulse Controlled Dispatch Desk | `COMPLETE` | `047c79d`; production health failed the existing destination closed |
| Live controlled-desk contact | Send and call an authorized Singapore test desk | `CUT` | No authorized Singapore-format destination is configured; production remains verification-only |
| Access control | Gate telephony with a private demo code and report/location-bound short-lived token | `COMPLETE` | `047c79d`; signed-token safeguards |
| Dry-run | Ensure verification-only mode sends no SMS, webhook, or call | `COMPLETE` | `047c79d`; local visible dry-run QA |
| Evidence model | Separate brief receipt, vehicle assignment, destination, and ETA with recipient excerpts | `COMPLETE` | `047c79d`; safeguard suite |
| UI | Rebuild mobile and desktop screens around capture, review, connect, and evidence receipt | `COMPLETE` | `782a2a4`; local responsive QA |
| Accessibility | Add focus management, live status announcements, reduced motion, narrow-screen, and zoom support | `COMPLETE` | `782a2a4`; `docs/submission/QA_LEDGER.md` |
| Reliability | Bound requests and polling, prevent duplicate dispatch, and restore active status after refresh | `COMPLETE` | `047c79d`, `782a2a4` |
| Security/privacy | Add bounded input, no-store responses, fixed destinations, safer public claims, and recording controls | `COMPLETE` | `047c79d` |
| Documentation | Add truthful README, Build Week record, judge instructions, QA ledger, and video materials | `COMPLETE` | Documentation commit containing this record |
| Licensing | Add the owner-authorized MIT license | `COMPLETE` | Documentation commit containing `LICENSE` |
| Deployment | Deploy the eligible-period merge to `https://savepulse.vercel.app` | `COMPLETE` | `e992347`; Vercel deployment `dpl_FcAsEXJ5qtgi2Sem5vfbkt9R5LT6`; approximately July 22, 2026 at 01:03 IST |
| Production health | Verify GPT‑5.6, Realtime, provider configuration, Google availability, and the destination boundary | `COMPLETE` | GPT‑5.6, Realtime, Vapi, and Twilio verified; Google unavailable; controlled desk failed closed |
| Visible production E2E | Exercise the deployed typed/manual and verification-only user journey | `PENDING` | See `docs/submission/QA_LEDGER.md` |

Allowed final statuses are `COMPLETE`, `CUT`, or `BLOCKED`. If a row is cut or
blocked, update the public story and known limitations instead of implying it is
complete.

## Final commit evidence

| Milestone | Commit SHA | Commit timestamp | Evidence |
| --- | --- | --- | --- |
| GPT-5.6 and controlled-dispatch backend | `047c79d` | July 22, 2026 IST | Code diff and safeguard suite |
| Ground-up UI and accessibility | `782a2a4` | July 22, 2026 IST | Design references and local responsive QA |
| Reliability and production contract | `047c79d`, `782a2a4` | July 22, 2026 IST | Safeguards, build, and local visible QA |
| Documentation and submission assets | `f73d0cc` | July 22, 2026 at 01:00 IST | README, license, QA ledger, design and submission materials |
| Merge to `main` | `e992347` | July 22, 2026 at 01:01:30 IST | `https://github.com/13shreyansh/pulseguard/commit/e992347` |
| Production deployment | `e992347` | Approximately July 22, 2026 at 01:03 IST | `https://savepulse.vercel.app`; Vercel deployment `dpl_FcAsEXJ5qtgi2Sem5vfbkt9R5LT6` |

## Contribution record

### Shreyansh

- supplied the emergency-coordination problem and intended user impact;
- chose Singapore as the target context;
- selected the Controlled Dispatch product direction;
- supplied or authorized the repository, deployment, and controlled response-desk
  environment;
- directed Codex to audit, rebuild, test, document, publish, and submit the
  eligible-period extension.

### Codex / GPT-5.6 collaboration

- audited the repository, documentation, provider routes, production behavior,
  and visual user journey;
- identified broken integrations, state-integrity defects, and false-success
  paths;
- developed the implementation and release plan;
- produced original visual exploration and translated it into code;
- implemented the Build Week code and documentation changes;
- performed browser-led visual and functional QA;
- prepared the demo narration, video plan, screenshots, and Devpost copy;
- prepared deployment and submission actions under the project owner's direction.

The accurate framing is **human-directed, Codex-executed collaboration**. It is
not accurate to claim that the human contributed nothing.

## Evidence required before submission

- [x] Meaningful extension commits have eligible-period timestamps.
- [x] Each implemented extension claim maps to a commit or QA artifact.
- [x] Production is serving the documented eligible-period SHA.
- [ ] A user-visible GPT-5.6 path is verified in production.
- [ ] Exact production model identifier is recorded.
- [ ] Typed/manual-location path works signed out through review.
- [x] Production refuses the unapproved, non-Singapore destination.
- [x] Production is configured for no-contact verification-only behavior.
- [x] Local dry-run evidence receipt leaves every unsupported field Unknown.
- [x] Ambiguous answers remain Unknown in the safeguard suite.
- [x] Public repository includes the owner-authorized license.
- [x] README clearly labels pre-existing and Build Week work.
- [x] QA ledger records the deployed SHA, local device checks, production health, and known limitation.
- [ ] Video shows the deployed extension and remains under three minutes.
- [ ] Devpost story contains no pending or unverified claim.

## Claims Pulse does not make

Even after the extension is complete, Pulse must not claim:

- affiliation with OpenAI beyond participation in Build Week;
- affiliation with SCDF, the Singapore government, a hospital, or an ambulance
  provider;
- replacement of calling 995 for a real Singapore emergency;
- clinical diagnosis, treatment recommendation, or medical-device status;
- verified hospital capability, capacity, acceptance, or availability from a
  Google listing;
- ambulance or responder assignment without explicit recipient evidence;
- destination or ETA without explicit recipient evidence;
- that a provider-completed call proves operational acceptance;
- that mocked browser tests prove production integrations;
- that all work was created during Build Week;
- that the human project owner had no role.

## Final truthful extension statement

> Pulse began Build Week as a pre-existing Next.js emergency-help prototype last
> updated on June 5, 2026. During the eligible period, Shreyansh directed Codex to
> add a ground-up interface, GPT‑5.6 structured observations, edit-safe voice
> capture, incident-bound authorization, fail-closed dispatch controls, and
> field-specific evidence validation. Merge commit `e992347` is deployed at
> `https://savepulse.vercel.app`. Production health verified GPT‑5.6, Realtime,
> Vapi, and Twilio configuration, while Google remained unavailable. Because no
> authorized Singapore-format desk line is configured, the release runs in
> verification-only mode and no message or call was made. Pulse does not contact
> or represent official emergency services, hospitals, or ambulance providers.
