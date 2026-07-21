# Pulse — Release QA Ledger

This ledger records visible product checks and narrow invariants for a controlled
prototype. It is not an emergency-service readiness certification. Every
incident used below is synthetic, and no real emergency service, hospital,
ambulance provider, patient, or family member is contacted.

## Release under test

| Field | Value |
| --- | --- |
| Production URL | `https://savepulse.vercel.app` |
| Pre-extension baseline | `a83e85c` |
| Release commit | Pending eligible-period commit and deployment |
| Tester | Codex, directed by Shreyansh |
| Controlled recipient | Authorized fixed Pulse Controlled Dispatch Desk |
| Outbound authorization | Authorized by the project owner for one controlled synthetic test |
| Current limitation | Production verification remains pending until the eligible-period deployment is live |

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
| Hospital lookup unavailable | Desktop | Pass | Care context showed unavailable and did not block dispatch |
| User edits report | Desktop | Pass | Edited text remained unchanged after delayed async activity |
| Verification-only dispatch | Desktop | Pass | Result explicitly said no message, webhook, or call was sent; all evidence stayed Unknown |
| Double activation | Desktop | Pass | One visible incident advanced; client synchronously locked the action and server replay protection remained active |
| Responsive flow | 390×844 | Pass | No horizontal overflow; capture and review actions remained reachable |
| Narrow flow | 320×568 | Pass | Landing, capture, review, and result had no horizontal overflow or hidden primary action |
| Controlled-prototype boundary | Desktop, 390, 320 | Pass | Disclosure and persistent Singapore 995 escape remained visible |
| Programmatic focus | Desktop/mobile | Pass after fix | Screen heading no longer received an oversized visual focus outline |
| Mobile action density | 320×568 | Pass after fix | Compact safe-area action bar preserved content and primary action |
| Microphone path | Desktop | Blocked locally | Chrome permission remained pending and the local OpenAI key is intentionally unavailable; production retest required |

## Production checks

The following rows must be completed from the deployed eligible-period build.
Unknown or blocked provider facts must remain explicit; no extra calls will be
placed solely to make the ledger look complete.

| Scenario | Required result | Actual result | Status | Evidence artifact |
| --- | --- | --- | --- | --- |
| Signed-out load | Public landing and review path load | Pending | Pending | Pending |
| GPT-5.6 brief | User-visible structured observation brief | Pending | Pending | Pending |
| Manual/typed path | Review can be completed without GPS or microphone | Pending | Pending | Pending |
| Demo-code gate | Outbound operation is impossible without the private code | Pending | Pending | Pending |
| Controlled desk operation | Exactly one fixed authorized desk operation | Pending | Pending | Pending |
| Evidence receipt | Unsupported receipt, assignment, destination, and ETA remain Unknown | Pending | Pending | Pending |
| Refresh during polling | Polling resumes without creating another operation | Pending | Pending | Pending |
| 320 and 390 layouts | No horizontal loss or hidden primary action | Pending | Pending | Pending |
| Keyboard and zoom | Reachable controls, visible focus, no horizontal loss | Pending | Pending | Pending |
| Reduced motion and live status | No continuous motion; major state changes announced | Pending | Pending | Pending |

## Release blockers

- Any destination other than the server-configured authorized Singapore desk.
- Any contact in dry-run or without the private demo code.
- Any duplicate outbound operation.
- Any false confirmation of receipt, assignment, destination, or ETA.
- An overwritten witness edit or stale incident data.
- An unusable manual-location and typed-report path.
- Exposure of a phone number, access code, token, call ID, provider log, or full
  private transcript.
- Production not serving the documented eligible-period commit.

## Sign-off

Release is **pending production deployment and visible production E2E**. The
project owner authorized implementation, controlled testing, deployment, public
demo publication, and Devpost submission in the current Codex task. Final
release and submission timestamps will be recorded here after verification.
