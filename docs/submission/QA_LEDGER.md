# Pulse — Release QA Ledger

This ledger records visible product checks, production health facts, and narrow
invariants for a controlled prototype. It is not an emergency-service readiness
certification. Every incident is synthetic. No real emergency service, hospital,
ambulance provider, patient, family member, or unapproved destination is
contacted.

## Release under test

| Field | Value |
| --- | --- |
| Production URL | `https://savepulse.vercel.app` |
| Public Devpost project | `https://devpost.com/software/pulse-gkw6ul` — saved and unauthenticated HTTP 200 verified July 22, 2026 |
| Pre-extension baseline | `a83e85c` |
| Deployed application commit | `e7e4bd9` (`e7e4bd933ea644bf5d6ef7542a06f498fd8defcf`) |
| Vercel deployment | `dpl_8mHxF7LejANyF4jFFtjKrvpDTvma` |
| Deployment time | Approximately July 22, 2026 at 01:09 IST |
| Tester | Codex, directed by Shreyansh |
| Production mode | `dry_run` / verification-only |
| Controlled recipient | None in this release: the existing configured destination did not pass the required Singapore `+65` authorization check |
| Outbound result | No SMS, webhook, or call was sent |
| Visible E2E | Completed July 22, 2026 from approximately 01:10–01:14 IST |
| Current limitation | Chrome's native microphone permission remained pending; public video remains pending; the Build Week entry is closed at `Draft — 1/5 steps done` until an organizer grants late-submission access |

The live-capable transport code remains fixed-destination and fail-closed. Vapi
and Twilio configuration passing a health probe does not mean that either
provider was used for an outbound operation.

## Compatibility and invariant checks

| Check | Method | Result | Scope |
| --- | --- | --- | --- |
| Lint | `npm run lint` | Pass | Static compatibility only |
| Production build | `npm run build` | Pass | Compilation only |
| Signed dispatch binding | `npm run test:safeguards` | Pass | Client, incident, report, and location binding |
| Encrypted status token | `npm run test:safeguards` | Pass | Provider call ID is not exposed in the token |
| Generic “yes” rejection | `npm run test:safeguards` | Pass | Cannot confirm vehicle assignment |
| Recipient evidence validation | `npm run test:safeguards` | Pass | Invented or assistant-only excerpts are rejected |
| Destination and ETA independence | `npm run test:safeguards` | Pass | Both require separate exact excerpts |

These safeguards do not count as end-to-end product evidence.

## Visible local user checks

Local checks used the production build in Chrome 150.0.7871.129. No provider
contact was made.

| Scenario | Viewport | Result | Evidence / observation |
| --- | --- | --- | --- |
| Manual location and typed report | Desktop | Pass | Capture, editable review, and dispatch authorization states completed visibly |
| Model unavailable | Desktop | Pass | The raw reviewed report remained usable with an honest warning |
| Hospital lookup unavailable | Desktop | Pass | Care context showed unavailable and did not block the flow |
| User edits report | Desktop | Pass | Edited text remained unchanged after delayed async activity |
| Verification-only dispatch | Desktop | Pass | Result explicitly said no message, webhook, or call was sent; all evidence stayed Unknown |
| Double activation | Desktop | Pass | One visible incident advanced; the client synchronously locked the action and server replay protection remained active |
| Responsive flow | 390×844 | Pass | No horizontal overflow; capture and review actions remained reachable |
| Narrow flow | 320×568 | Pass | Landing, capture, review, and result had no horizontal overflow or hidden primary action |
| Controlled-prototype boundary | Desktop, 390, 320 | Pass | Disclosure and persistent Singapore 995 escape remained visible |
| Programmatic focus | Desktop/mobile | Pass after fix | Screen heading no longer received an oversized visual focus outline |
| Mobile action density | 320×568 | Pass after fix | Compact safe-area action bar preserved content and primary action |
| Microphone path | Desktop | Blocked locally | Chrome permission remained pending and the local OpenAI key was intentionally unavailable |

## Production health verification

The deployed application was inspected through non-mutating production health probes.
These checks establish configuration and provider reachability only; they do not
prove a visible user journey or outbound desk operation.

| Integration / boundary | Result | Meaning |
| --- | --- | --- |
| GPT‑5.6 | Verified | The production model probe succeeded |
| OpenAI Realtime | Verified | Production Realtime configuration passed its health check |
| Vapi | Verified | Provider configuration passed a non-mutating health check; no call was started |
| Twilio | Verified | Provider configuration passed a non-mutating health check; no message was sent |
| Google hospital context | Unavailable | The production query is unavailable; the UI must remain non-blocking |
| Controlled desk | Fail-closed | The existing configured destination is not an authorized Singapore-format line |
| Dispatch mode | Verification-only | Production uses `dry_run`, which must send no SMS, webhook, or call |

## Visible production checks

These checks were performed through the visible deployed interface in Chrome
150.0.7871.129. No extra call was placed solely to make the ledger appear
complete.

| Scenario | Required result | Actual result | Status | Evidence artifact |
| --- | --- | --- | --- | --- |
| Public load | Public landing and review path load | Loaded without application authentication and completed the review journey | Pass | `production-landing-desktop.jpg`, `production-review-desktop.jpg` |
| GPT‑5.6 brief | User-visible structured observation brief | Visible brief returned from `gpt-5.6-sol`; edits were reflected after explicit update | Pass | `production-review-gpt56.jpg` |
| Manual/typed path | Review can be completed without GPS or microphone | Manual location and typed synthetic report completed capture and review | Pass | `production-capture-desktop.jpg` |
| Edit ownership | A witness correction remains intact | `left arm` was changed to `left shoulder`; the value persisted and the brief became visibly stale until updated | Pass | Visible browser inspection, 01:11 IST |
| Google unavailable | Optional care context cannot block the flow | Unavailable warning appeared; verification action remained usable | Pass | `production-review-gpt56.jpg` |
| Demo-code gate | Final verification operation is impossible without the private code | Final button stayed disabled before the private code and review confirmation | Pass | Visible browser inspection |
| Verification-only terminal state | UI states that no desk contact was made and every evidence field is Unknown | Terminal banner stated no message, webhook, or call; receipt, assignment, destination, and ETA were all Unknown | Pass | `production-result-verification.jpg` |
| Double activation | Rapid activation cannot create duplicate contact | A deliberate double activation reached one terminal incident; production dry-run has no outbound side effect | Pass | Visible browser inspection |
| No-contact boundary | No SMS, webhook, or call occurs | Production reported `dry_run`; the server returned before every outbound transport path | Pass | Production health plus terminal receipt |
| Live controlled-desk operation | Exactly one authorized Singapore desk operation | Not attempted; no authorized Singapore-format destination is configured | Cut for this release | Production health boundary |
| Refresh during polling | Polling resumes without creating another operation | Not applicable to the immediate dry-run terminal response; live restoration remains implemented but unexercised | Not run | Documented limitation |
| 320 and 390 layouts | No horizontal loss or hidden primary action | `scrollWidth` equalled viewport width at both sizes; primary actions remained reachable | Pass | `production-review-mobile-320.jpg`, `production-review-mobile-390.jpg` |
| Keyboard focus | Logical focus with visible focus ring | Tabbing from the review confirmation reached the next available control with a solid outline | Pass | Visible browser inspection |
| 200% zoom | No horizontal loss | Not explicitly emulated; narrower 320 px layout passed | Not run | Non-blocking documented limitation |
| Reduced motion and live status | No continuous motion; major state changes announced | Reduced-motion CSS is present and major states appeared in the accessible live region; OS setting not explicitly emulated | Partial | Code inspection and DOM snapshot |
| Production microphone | Realtime voice can start with permission | Native Chrome permission remained pending; the page was reloaded to close the request and no active stream remained | Blocked | Browser permission boundary |

## Release blockers

- Any destination other than a server-configured, explicitly authorized Singapore
  `+65` controlled desk.
- Any contact in `dry_run` or without the private demo code.
- Any duplicate outbound operation.
- Any false confirmation of receipt, assignment, destination, or ETA.
- An overwritten witness edit or stale incident data.
- An unusable manual-location and typed-report path.
- Exposure of a phone number, access code, token, call ID, provider log, or full
  private transcript.
- Production not serving the documented eligible-period commit.

## Sign-off

### Devpost recovery record

At approximately July 22, 2026 at 09:45 IST, the project owner authorized and
Codex sent a private late-submission request through the OpenAI Build Week
submission's **Message manager** thread. Devpost displayed `Your message has been
sent!` and the thread showed the message less than a minute old. The request
included the production URL, public Devpost portfolio project, public repository,
this QA ledger, and Codex session/feedback ID
`019f703a-a871-7022-8096-498e8d54d8dc`. It accurately explained that the final
personal rules attestation and Submit action were not completed before the
deadline. An organizer-provided late-submission link remains pending and is not
assumed.

At approximately July 22, 2026 at 09:50 IST, Codex sent a separate escalation
from the project owner's signed-in Gmail account to the publicly listed event
address `build-week-event@openai.com`, copying Devpost's public testing and support
addresses `testing@devpost.com` and `support@devpost.com`. Gmail displayed
`Message sent`. The email apologized, accepted responsibility for the missed
personal attestation, linked the same session and release evidence, and requested
that the case be routed to Build Week submission operations. No private staff
email address was guessed or scraped.

At 09:51 IST, Gmail returned a delivery failure for
`build-week-event@openai.com`: the published Google group may not exist or may
not permit outside posting. No delivery failure was reported for the two Devpost
addresses. At approximately 09:54 IST, Codex sent the same factual routing request
to OpenAI's officially published support address, `support@openai.com`; Gmail
confirmed `Message sent`. At approximately 09:56 IST, Codex sent one restrained
routing-only note to two Build Week judges whose contact addresses are explicitly
published on their own websites: Kath Korevec (`kathy@korevec.com`) and Peter
Steinberger (`peter@steipete.me`). The note stated that it was not a request to
influence judging and asked only that the operational appeal be forwarded to the
event owner. No guessed address was used for Thibault Sottiaux, Tara Seshan, or
Leah Belsky. An immediate targeted Gmail check showed no delivery failure for the
support or judge messages.

At 09:55 IST, OpenAI Support acknowledged the routing request as case
`11899844` and stated that it had been escalated to a support specialist, with a
response expected in the coming days. The acknowledgement did not include a
late-submission link, approval, or event-operations decision. The Devpost manager
thread also remained unanswered at the time of this check, so no submission
permission is inferred.

At approximately 10:00 IST, the closed Build Week page exposed an official
`Email the hackathon manager` link for `shawni@devpost.com`. Codex sent one
direct, factual appeal to that published address. The message identified draft
`1080636` and support case `11899844`, explained the missed personal attestation,
linked the production site, public project, repository, this ledger, and the
Codex session ID, and requested either a private late-submission link or a brief
reopening of the existing draft. Gmail displayed `Message sent`. This was an
official event-manager route; the address was not inferred or guessed.

At 10:03 IST, Codex performed a final targeted response check covering the
Devpost manager thread, OpenAI Support, the published hackathon manager, Devpost
support/testing, and the two published judge addresses. No new response or
private link was present. Opening draft `1080636` still returned: `Sorry! This
hackathon is no longer accepting submissions. The submission can't be edited or
viewed.` Submission therefore requires a new organizer-controlled state change;
no further message was sent during this check.

At approximately 10:10 IST (12:40 SGT), Codex sent a fresh appeal from
`SHREYANS002@e.ntu.edu.sg`, the account shown in Outlook as the Build Week
registration and Devpost-account inbox. The message was addressed to the
published hackathon manager and event mailbox, with Devpost testing/support and
OpenAI Support copied. It explicitly stated that Codex made the execution error,
asked that the failure not prejudice Shreyansh or Pulse, and preserved the
requirement that Shreyansh personally make the rules attestation if access is
restored. Outlook Sent Items shows the message with subject `From registered
Devpost account: Codex execution error — Pulse draft 1080636`.

That registered inbox also contains Devpost's official notice extending the
final deadline from the initially published 5:00 PM PT to **6:00 PM PT on July
21**. The registered-account appeal corrected the earlier recovery messages'
5:00 PM reference. This correction does not claim that submission succeeded or
that late access has been granted.

At approximately 10:11 IST (12:41 SGT), the registered inbox received two
automated responses. The published `build-week-event@openai.com` Google Group
again rejected delivery. OpenAI Support opened case `11900336` and stated that
OpenAI product support cannot reopen Devpost drafts or provide late-submission
links. No delivery failure was shown for `shawni@devpost.com`, Devpost support,
or Devpost testing. The Devpost manager thread still contained no organizer
reply, so the actionable request remains with the published hackathon manager
and Devpost operations; Codex did not send another duplicate message.

At 10:14 IST, a third registered-account response check found no reply from the
hackathon manager, Devpost support/testing, or the Devpost manager thread. The
only newer inbox item was unrelated. Opening draft `1080636` again returned the
closed-hackathon message and did not expose any editable submission fields.
Completion now requires an organizer-controlled late link or draft reopening;
there is no remaining non-duplicative action that can create that permission.

The eligible-period application is deployed at commit `e7e4bd9` in
verification-only mode. The visible manual/typed production path, GPT‑5.6 brief,
private gate, responsive layouts, and terminal evidence receipt passed. Voice
remains blocked by the native browser permission prompt, and live polling is not
applicable to the immediate dry-run result. Video publication and Build Week
submission remain pending the organizer's response. This ledger does not claim
that a message or call occurred.
