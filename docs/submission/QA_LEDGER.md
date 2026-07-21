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
| Pre-extension baseline | `a83e85c` |
| Deployed merge commit | `e992347` (`e992347eb089e5ca7ec74cdff4fd72478192f765`) |
| Vercel deployment | `dpl_FcAsEXJ5qtgi2Sem5vfbkt9R5LT6` |
| Deployment time | Approximately July 22, 2026 at 01:03 IST |
| Tester | Codex, directed by Shreyansh |
| Production mode | `dry_run` / verification-only |
| Controlled recipient | None in this release: the existing configured destination did not pass the required Singapore `+65` authorization check |
| Outbound result | No SMS, webhook, or call was sent |
| Current limitation | Visible production E2E, demo video publication, and Devpost submission remain pending |

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
| Microphone path | Desktop | Blocked locally | Chrome permission remained pending and the local OpenAI key was intentionally unavailable; production retest required |

## Production health verification

The deployed merge was inspected through non-mutating production health probes.
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

These rows remain pending until exercised from the deployed user interface. No
extra call will be placed solely to make the ledger appear complete.

| Scenario | Required result | Actual result | Status | Evidence artifact |
| --- | --- | --- | --- | --- |
| Signed-out load | Public landing and review path load | Pending | Pending | Pending |
| GPT‑5.6 brief | User-visible structured observation brief | Production health probe passed; visible path not yet exercised | Pending | Pending |
| Manual/typed path | Review can be completed without GPS or microphone | Pending | Pending | Pending |
| Demo-code gate | Final verification operation is impossible without the private code | Pending | Pending | Pending |
| Verification-only terminal state | UI states that no desk contact was made and every evidence field is Unknown | Pending | Pending | Pending |
| No-contact boundary | No SMS, webhook, or call occurs | `dry_run` is configured; visible run still pending | Pending | Pending |
| Live controlled-desk operation | Exactly one authorized Singapore desk operation | Not attempted; no authorized Singapore-format destination is configured | Cut for this release | Production health boundary |
| Refresh during polling | Polling resumes without creating another operation | Pending | Pending | Pending |
| 320 and 390 layouts | No horizontal loss or hidden primary action | Pending | Pending | Pending |
| Keyboard and zoom | Reachable controls, visible focus, no horizontal loss | Pending | Pending | Pending |
| Reduced motion and live status | No continuous motion; major state changes announced | Pending | Pending | Pending |

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

The eligible-period release is deployed at commit `e992347` in verification-only
mode. Production health verification is recorded above. Visible production E2E,
video publication, and Devpost submission are still pending. This ledger does
not claim that a message or call occurred.
