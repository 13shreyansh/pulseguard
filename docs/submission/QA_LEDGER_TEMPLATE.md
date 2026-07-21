# Pulse — Production QA Evidence Ledger

> Complete this ledger from the visible deployed product. It is evidence for a
> controlled prototype, not a certification of emergency-service readiness.
> Never record a real phone number, access code, token, call ID, full transcript,
> or patient-identifying information.

## Release under test

| Field | Value |
| --- | --- |
| Production URL | `https://savepulse.vercel.app` |
| Git commit SHA | `[SHA]` |
| Branch deployed | `[BRANCH]` |
| Deployment identifier | `[REDACTED_SAFE_REFERENCE]` |
| Test start | `[YYYY-MM-DD HH:MM TIMEZONE]` |
| Test end | `[YYYY-MM-DD HH:MM TIMEZONE]` |
| Tester | `Codex, directed by Shreyansh` |
| Controlled recipient | `Authorized Pulse Controlled Dispatch Desk` |
| Synthetic incident only | `[YES/NO]` |
| Outbound contact authorized | `[YES/NO]` |
| GPT-5.6 production model | `[EXACT_VERIFIED_MODEL_ID]` |
| Known production limitations | `[SUMMARY]` |

## Evidence standard

- A scenario passes only when the visible UI and relevant safe provider evidence
  agree.
- Lint, build, and narrow unit tests are compatibility or invariant checks; they
  do not prove that a production user journey works.
- A mocked hospital, mocked accepted call, or hardcoded DOM state cannot be cited
  as end-to-end proof.
- A provider call marked completed does not prove brief receipt, assignment,
  destination, or ETA.
- `Unknown` is the required result when recipient evidence is missing, ambiguous,
  or not attributable to the recipient.
- A controlled outbound test must target only the authorized server-configured
  desk and be run once per intentional scenario.

## Automated compatibility and invariant checks

| ID | Check | Command or method | Result | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| A-01 | Lint | `npm run lint` | `[PASS/FAIL]` | `[LOG_PATH]` | |
| A-02 | Production build | `npm run build` | `[PASS/FAIL]` | `[LOG_PATH]` | |
| A-03 | Dispatch-token validation | `[COMMAND]` | `[PASS/FAIL]` | `[LOG_PATH]` | Narrow invariant only. |
| A-04 | Status-token encryption round trip | `[COMMAND]` | `[PASS/FAIL]` | `[LOG_PATH]` | Narrow invariant only. |
| A-05 | Generic “yes” rejection | `[COMMAND]` | `[PASS/FAIL]` | `[LOG_PATH]` | Must not populate unrelated fields. |
| A-06 | Recipient excerpt validation | `[COMMAND]` | `[PASS/FAIL]` | `[LOG_PATH]` | Reject assistant-side and absent excerpts. |
| A-07 | Dry-run no-contact behavior | `[COMMAND]` | `[PASS/FAIL]` | `[LOG_PATH]` | Confirm no message, webhook, or call. |
| A-08 | Malformed and oversized inputs | `[COMMAND]` | `[PASS/FAIL]` | `[LOG_PATH]` | Controlled 4xx; no provider call. |

## Visible product scenarios

| ID | Scenario | Device / viewport | Path | Expected result | Actual result | Status | Evidence file | Known limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E-01 | GPS and microphone permitted | Desktop Chrome `[VERSION]`, `[WIDTH×HEIGHT]` | Voice → review → controlled dispatch | Report is editable; one authorized desk operation; evidence-backed terminal state | `[RESULT]` | `[PASS/FAIL/BLOCKED]` | `[FILE]` | `[NOTE]` |
| E-02 | GPS denied | Mobile Chrome/Safari, 390×844 | Manual location → typed report | Manual location completes the workflow | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-03 | Microphone denied | Mobile, 390×844 | GPS/manual location → typed report | Typed entry remains fully usable | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-04 | Narrow screen | Mobile, 320×568 | Landing through result | No clipping, horizontal scroll, or hidden primary action | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-05 | User edits transcript | Desktop and mobile | Voice → edit → wait → review | Late transcription never overwrites the edit | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-06 | Second incident isolation | Desktop | Voice incident → reset terminal state → typed incident | No prior audio, text, status, or provider event appears | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-07 | Google lookup unavailable | Production | Complete report while lookup returns unavailable | Controlled dispatch remains available; UI makes no capability claim | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-08 | GPT-5.6 unavailable/timeout | Safe controlled fault path | Review report | Raw reviewed report remains usable with honest warning | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-09 | Explicit recipient evidence | Authorized desk | Controlled dispatch | Each confirmed field has recipient evidence | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-10 | Ambiguous recipient language | Authorized controlled scenario, only if safely available | Controlled dispatch | Unsupported fields stay Unknown | `[RESULT]` | `[PASS/FAIL/NOT_RUN]` | `[FILE]` | Do not place extra calls solely to fill the ledger. |
| E-11 | No answer | Provider-controlled scenario, only if safely available | Controlled dispatch | UI reports unreachable/not confirmed, never assigned | `[RESULT]` | `[PASS/FAIL/NOT_RUN]` | `[FILE]` | |
| E-12 | Message failure | Safe local/provider fault path | Dispatch | UI never says brief delivered | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-13 | Refresh during polling | Production | Dispatch → refresh | Existing status resumes without another outbound operation | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-14 | Double activation | Production | Double-click/tap Send | Exactly one outbound operation | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | Check safe provider evidence. |
| E-15 | Verification-only mode | Local/preview dry-run | Complete flow | No message, webhook, or call; no green contact claim | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-16 | Keyboard-only navigation | Desktop | Complete capture and review | Logical focus, visible focus, no keyboard trap | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-17 | VoiceOver | macOS/iOS | Change every major state | Progress, errors, and terminal result are announced | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-18 | Reduced motion | Desktop/mobile setting | Complete flow | No continuous or misleading motion | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-19 | 200% zoom | Desktop, 200% | Landing through review/result | Content and actions remain reachable without horizontal loss | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |
| E-20 | Signed-out public review | Incognito/private browser | Landing → review without demo code | Public product loads; telephony stays gated | `[RESULT]` | `[PASS/FAIL]` | `[FILE]` | |

## Screen-by-screen visual review

Use actual production screenshots. Store only redacted, synthetic evidence.

| Screen | Desktop | 390×844 | 320×568 | Keyboard focus | 200% zoom | Decision / fixes |
| --- | --- | --- | --- | --- | --- | --- |
| Landing | `[FILE]` | `[FILE]` | `[FILE]` | `[PASS/FAIL]` | `[PASS/FAIL]` | `[NOTES]` |
| Capture | `[FILE]` | `[FILE]` | `[FILE]` | `[PASS/FAIL]` | `[PASS/FAIL]` | `[NOTES]` |
| Review | `[FILE]` | `[FILE]` | `[FILE]` | `[PASS/FAIL]` | `[PASS/FAIL]` | `[NOTES]` |
| Connecting | `[FILE]` | `[FILE]` | `[FILE]` | `[PASS/FAIL]` | `[PASS/FAIL]` | `[NOTES]` |
| Result | `[FILE]` | `[FILE]` | `[FILE]` | `[PASS/FAIL]` | `[PASS/FAIL]` | `[NOTES]` |
| Error / unavailable | `[FILE]` | `[FILE]` | `[FILE]` | `[PASS/FAIL]` | `[PASS/FAIL]` | `[NOTES]` |

Visual checks for every screenshot:

- [ ] Primary action and current state are visible without unnecessary scrolling.
- [ ] `Controlled prototype` boundary is visible and understandable.
- [ ] `Call 995` escape remains available for a real Singapore emergency.
- [ ] No location is labelled sent before dispatch begins.
- [ ] Green appears only for verified evidence.
- [ ] Unknown and pending states are not visually successful.
- [ ] Text does not split into awkward single-word headline rows.
- [ ] No horizontal clipping or hidden action.
- [ ] Long manual location and report text wrap safely.
- [ ] Focus ring is visible.
- [ ] Dynamic state has an accessible announcement.

## Controlled provider evidence

Record safe conclusions, not provider secrets.

| Field | Value |
| --- | --- |
| Test incident ID | `[NON_SECRET_APP_REFERENCE]` |
| Outbound operation count | `[COUNT]` |
| Destination class | `Authorized fixed controlled desk` |
| Message attempted | `[YES/NO]` |
| Message acknowledged | `[YES/NO/UNKNOWN]` |
| Call attempted | `[YES/NO]` |
| Provider terminal state | `[CONNECTED/COMPLETED/NO_ANSWER/FAILED/NOT_RUN]` |
| Brief received evidence | `[YES/NO/UNKNOWN — SHORT REDACTED EXCERPT OR NONE]` |
| Vehicle assigned evidence | `[YES/NO/UNKNOWN — SHORT REDACTED EXCERPT OR NONE]` |
| Destination evidence | `[VALUE/UNKNOWN — SHORT REDACTED EXCERPT OR NONE]` |
| ETA evidence | `[VALUE/UNKNOWN — SHORT REDACTED EXCERPT OR NONE]` |
| UI terminal outcome | `[OUTCOME]` |
| UI/provider agreement | `[YES/NO]` |
| Recording disabled | `[VERIFIED/NOT_VERIFIED]` |

## Defect log

| ID | Severity | Scenario | Evidence | User impact | Resolution / decision | Retest |
| --- | --- | --- | --- | --- | --- | --- |
| `[Q-001]` | `[BLOCKER/HIGH/MEDIUM/LOW]` | `[SCENARIO]` | `[FILE]` | `[IMPACT]` | `[FIX/CUT/DOCUMENT]` | `[PASS/PENDING]` |

Release blockers include:

- false confirmation of assignment, destination, or ETA;
- contact with any destination other than the authorized controlled desk;
- dry-run sending a message or starting a call;
- duplicate outbound operation;
- demo access bypass;
- user edit overwritten by transcription;
- stale incident audio or status leakage;
- inability to complete the typed/manual-location path;
- public exposure of a number, code, token, ID, private transcript, or secret;
- production build not matching the documented commit.

## Final release gate

- [ ] Production resolves to the expected eligible-period SHA.
- [ ] GPT-5.6 is verified in a real user-visible path.
- [ ] Typed/manual-location production path passes.
- [ ] Voice edit ownership and second-incident isolation pass.
- [ ] Google failure does not block the controlled handoff.
- [ ] Only the authorized fixed desk can be contacted.
- [ ] Demo access is required for any outbound contact.
- [ ] Dry-run contacts nobody.
- [ ] Duplicate activation produces one operation.
- [ ] Ambiguous evidence remains Unknown.
- [ ] Vehicle assignment requires field-specific recipient evidence.
- [ ] Mobile 320 and 390 layouts pass visual review.
- [ ] Keyboard, VoiceOver status, reduced motion, and zoom checks pass or any
  non-blocking limitation is explicitly documented.
- [ ] No sensitive value appears in public evidence.
- [ ] README, video, Devpost draft, and production UI describe the same behavior.

## Sign-off

| Role | Name | Decision | Timestamp | Notes |
| --- | --- | --- | --- | --- |
| Implementation/QA agent | Codex | `[RELEASE / DO NOT RELEASE]` | `[TIME]` | `[NOTES]` |
| Project owner | Shreyansh | `[AUTHORIZED VIA TASK / FOLLOW-UP NEEDED]` | `[TIME]` | `[NOTES]` |
