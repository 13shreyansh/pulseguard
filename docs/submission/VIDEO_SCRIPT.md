# Pulse — 2:42 Demo Video Script

> Target runtime: **2 minutes 42 seconds**. Use only the deployed production
> build. Production is verification-only: do not imply that a message, webhook,
> or call occurred. Do not show a phone number, access code, token, call ID,
> provider dashboard, private transcript, or real patient data.

## Production specification

- Canvas: 1920×1080, 30 fps
- Narration: OpenAI `gpt-4o-mini-tts`, `marin`, calm and conversational
- Captions: burned-in English captions with high contrast
- Music: none
- Hard duration limit: under 3:00
- Footage: actual deployed product at `https://savepulse.vercel.app`
- Deployed merge: `e992347`
- Incident: synthetic only
- Contact: none; production `dry_run` sends no SMS or webhook and starts no call
- Public video URL: `[PUBLIC_YOUTUBE_URL]` — pending

## Timed narration and shots

### 0:00–0:17 — The problem

**Visual**

- Warm neutral title card: `PULSE`
- Three phrases: `Help the person`, `Report clearly`, `Coordinate a response`
- Cut to the implemented mobile landing screen

**Narration**

> Hi, I'm Codex, powered by GPT-5.6. Shreyansh brought me a real problem: in the
> first minutes after an accident, a bystander may be trying to help the person,
> explain the location, and coordinate a response—all at once.

### 0:17–0:36 — Product boundary

**Visual**

- Landing headline and `Controlled prototype` label
- Highlight `Call 995 for a real emergency`
- Tap `Start controlled dispatch`

**Narration**

> Pulse turns that confusion into one reviewable handoff. It is a controlled
> prototype, not an emergency service. For a real emergency in Singapore, call
> 995. This production release is verification-only and makes no outbound contact.

### 0:36–1:13 — Capture and review

**Visual**

- Enter manual location: `Marina Bay Sands, 018956`
- Type the synthetic report
- Edit one word visibly
- Tap `Review report`
- Show structured observation fields and at least one `Unknown`

**Narration**

> A witness can use browser location or type an address, postal code, or
> landmark. They can speak or type what they observe. Here, I correct the report
> before the final operation. That correction remains mine; a late transcription
> cannot overwrite it. GPT-5.6 structures the reviewed words into observable
> facts—such as consciousness, breathing, visible bleeding, and missing details.
> It does not diagnose the person, prescribe treatment, or invent an answer. When
> the report does not say something, Pulse shows Unknown.

### 1:13–1:42 — Fail-closed handoff

**Visual**

- Show the controlled-desk destination disclosure
- Exclude or fully obscure the private access code
- Confirm the reviewed package
- Run the final operation once
- Show the verification progress

**Narration**

> Pulse's live-capable path accepts only a fixed, authorized Singapore desk. The
> existing destination did not pass that check, so we kept production in dry-run
> mode. The signed incident flow still runs, but it sends no message or webhook
> and starts no call. A deadline is not a reason to contact an unapproved number.

### 1:42–2:08 — Honest result

**Visual**

- Show the actual verification-only terminal screen
- Highlight `No desk contact was made`
- Move across receipt, assignment, destination, and ETA rows
- Keep every row visibly `Unknown`

**Narration**

> The final screen is an evidence receipt, not a generic success animation. In
> this run, no desk contact was made, so brief receipt, vehicle assignment,
> destination, and ETA all remain Unknown. The code can validate exact,
> recipient-side evidence in a future authorized live test, but it does not
> fabricate evidence when no conversation happened.

### 2:08–2:29 — How it was built

**Visual**

- Simple implementation diagram or clean code/product montage
- Labels: `OpenAI Realtime`, `GPT-5.6 Responses`, `Next.js`, `Fail-closed transport`
- Show the public GitHub repository and eligible-period merge

**Narration**

> OpenAI Realtime supports optional voice transcription, and GPT-5.6 provides
> strict structured observations. Next.js binds each reviewed incident to
> short-lived tokens and prevents browser-selected destinations. Production
> health verified GPT-5.6, Realtime, Vapi, and Twilio, while Google remained
> unavailable. Provider configuration is not a claim that contact occurred.

### 2:29–2:42 — Close

**Visual**

- Return to the best mobile result shot
- End card: `PULSE — Clear observations. Honest outcomes.`
- Small production and repository links

**Narration**

> Pulse's next step is an authorized Singapore partner. Today it demonstrates a
> simpler principle: make the report clear, keep the user in control, and let
> evidence—not assumptions—define the outcome.

## Edit notes

1. Record the deployed verification-only journey; do not substitute local or
   generated interface footage for product screens.
2. Cut loading waits with straight cuts. Never relabel the dry-run result as a
   live provider outcome.
3. Keep the private code fully out of frame rather than relying on a partial blur.
4. Hold each `Unknown` evidence row long enough for a judge to read it.
5. Normalize narration volume and verify caption timing after the final render.
6. Watch the complete export signed out before uploading.

## Public YouTube metadata

**Title**

```text
Pulse — Evidence-First Controlled Handoff | OpenAI Build Week
```

**Description draft**

```text
Pulse helps a bystander capture and review a clear incident report and structure
the observations with GPT-5.6. Its evidence receipt keeps brief delivery,
assignment, destination, and ETA separate so unsupported facts remain unknown.

This production release is verification-only. The existing destination did not
pass the required Singapore authorization check, so Pulse sends no SMS or webhook
and starts no call. It is not affiliated with SCDF or a hospital and does not
replace calling 995 for a real emergency in Singapore.

Try Pulse: https://savepulse.vercel.app
Source: https://github.com/13shreyansh/pulseguard

Shreyansh provided the problem and product direction. Codex performed the Build
Week audit, implementation, visual exploration, local QA, documentation, and demo
preparation under that direction.
```

## Video verification — pending

- [ ] Final duration is below 3:00.
- [ ] Opening identifies Codex and GPT-5.6 accurately.
- [ ] The UI shown is deployed merge `e992347` or its documented successor.
- [ ] The incident is synthetic.
- [ ] Narration states that no outbound contact occurred.
- [ ] No official-service, hospital, or ambulance affiliation is implied.
- [ ] No access code, number, token, ID, provider dashboard, or private transcript is visible.
- [ ] Captions match narration and remain legible on mobile playback.
- [ ] Public video plays in a signed-out browser.
