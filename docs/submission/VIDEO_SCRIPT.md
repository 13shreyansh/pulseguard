# Pulse — 2:42 Demo Video Script

> Target runtime: **2 minutes 42 seconds**. Use only footage from the final
> deployed production build. Replace bracketed placeholders after the controlled
> E2E test. Do not show a phone number, access code, token, call ID, provider
> dashboard, private transcript, or real patient data.

## Production specification

- Canvas: 1920×1080, 30 fps
- Narration: OpenAI `gpt-4o-mini-tts`, `marin`, calm and conversational
- Captions: burned-in English captions with high contrast
- Music: none
- Hard duration limit: under 3:00
- Footage: actual deployed product at `https://savepulse.vercel.app`
- Incident: synthetic only
- Contact: authorized Pulse Controlled Dispatch Desk only

## Timed narration and shots

### 0:00–0:17 — The problem

**Visual**

- Warm neutral title card: `PULSE`
- Three short phrases enter one at a time: `Help the person`, `Report clearly`,
  `Coordinate a response`
- Cut to the implemented mobile landing screen

**Narration**

> Hi, I'm Codex, powered by GPT-5.6. Shreyansh brought me a real problem: in the
> first minutes after an accident, a bystander may be trying to help the person,
> explain the location, and coordinate a response—all at once.

### 0:17–0:35 — Product boundary

**Visual**

- Landing headline and `Controlled prototype` label
- Briefly highlight `Call 995 for a real emergency`
- Tap `Start controlled dispatch`

**Narration**

> Pulse turns that confusion into one reviewable handoff. It is a controlled
> prototype, not an emergency service. For a real emergency in Singapore, the
> interface says to call 995. Pulse contacts only our authorized test desk.

### 0:35–1:12 — Capture and review

**Visual**

- Enter manual location: `Marina Bay Sands, 018956`
- Choose microphone or type the synthetic report
- Recommended report: `A cyclist fell near the entrance. They are awake and
  breathing. Their left arm may be injured. I cannot see severe bleeding.`
- Edit one word visibly
- Tap `Review report`
- Show structured observation fields and at least one `Unknown`

**Narration**

> A witness can use browser location or type an address, postal code, or
> landmark. They can speak or type what they observe. Here, I correct the report
> before anything is sent. That correction remains mine; a late transcription
> cannot overwrite it. GPT-5.6 then structures the reviewed words into observable
> facts—such as consciousness, breathing, visible bleeding, and missing details.
> It does not diagnose the person, prescribe treatment, or invent an answer. When
> the report does not say something, Pulse shows Unknown.

### 1:12–1:40 — Controlled handoff

**Visual**

- Show `Who will be contacted`
- Highlight `Pulse Controlled Dispatch Desk`
- Blur or exclude the access code while entering it
- Check the review confirmation
- Press `Send to controlled desk` once
- Show progress states in sequence

**Narration**

> The review screen says exactly who will be contacted: the Pulse Controlled
> Dispatch Desk—not a hospital and not a public emergency service. Private access
> protects the live test path. After I confirm the report, Pulse sends one brief
> and starts one controlled call. Nearby hospital information is optional context;
> it can never block this handoff or claim clinical availability.

### 1:40–2:08 — Evidence result

**Visual**

- Cut waiting time, but do not fake or re-label provider states
- Show the actual verified terminal screen
- Zoom slowly across the evidence rows
- Keep unsupported rows visibly `Unknown`

**Narration**

> The final screen is an evidence receipt, not a generic success animation. Brief
> receipt, vehicle assignment, destination, and ETA are separate questions. A
> completed call does not mean a responder was assigned. GPT-5.6 extracts the
> recipient's answers, and Pulse checks that every evidence excerpt is really in
> the recipient transcript. One ambiguous yes cannot turn four unknowns green.
> In this run, [STATE THE EXACT VERIFIED OUTCOME].

### 2:08–2:29 — How it was built

**Visual**

- Simple implementation diagram or clean code/product montage
- Labels: `OpenAI Realtime`, `GPT-5.6 Responses`, `Next.js`, `Controlled desk`
- Show the public GitHub repository and eligible-period commit without lingering
  on private browser chrome

**Narration**

> Underneath, OpenAI Realtime supports optional voice transcription, and the
> Responses API provides strict structured outputs. Next.js binds the reviewed
> incident to short-lived tokens, while fixed server-side routing prevents a user
> from choosing an arbitrary call destination. During Build Week, Codex audited,
> rebuilt, tested, and documented this extension under Shreyansh's direction.

### 2:29–2:42 — Close

**Visual**

- Return to the best mobile result shot
- End card: `PULSE — Clear observations. Evidence-backed handoff.`
- Small links: production URL and GitHub repository

**Narration**

> Pulse's next step is partnership and operational validation, not unsupported
> claims. Today, it demonstrates a simpler principle: in a critical moment, make
> the report clear, keep the user in control, and let evidence—not assumptions—
> define the outcome.

## Edit notes

1. Record the production journey first; write the final outcome sentence from the
   evidence actually shown.
2. Cut loading waits with clean straight cuts. Never replace an unavailable or
   unconfirmed state with a fabricated successful state.
3. Use a cursor highlight only where it improves comprehension.
4. Keep mobile UI at readable scale; do not place the entire phone screen in a
   small corner of a 1080p frame.
5. Hold each evidence row long enough for a judge to read it.
6. Normalize narration volume and check caption timing after the final render.
7. Watch the complete exported file signed out before uploading.

## Public YouTube metadata

**Title**

```text
Pulse — Controlled Dispatch Handoff | OpenAI Build Week
```

**Description draft**

```text
Pulse helps a bystander capture and review a clear incident report, structure the
observations with GPT-5.6, and hand the brief to one authorized controlled
dispatch desk. Its final evidence receipt keeps brief delivery, assignment,
destination, and ETA separate so unsupported facts remain unknown.

Pulse is a controlled prototype. It is not affiliated with SCDF or a hospital,
does not contact public emergency services, and does not replace calling 995 for
a real emergency in Singapore.

Try Pulse: https://savepulse.vercel.app
Source: https://github.com/13shreyansh/pulseguard

Shreyansh provided the problem, product direction, and controlled-testing context.
Codex performed the Build Week audit, implementation, visual exploration, QA,
documentation, and demo production.
```

## Video verification

- [ ] Final duration is below 3:00.
- [ ] Opening identifies Codex and GPT-5.6 accurately.
- [ ] The UI shown is the deployed eligible-period build.
- [ ] The incident is synthetic.
- [ ] The actual controlled outcome is narrated accurately.
- [ ] No official-service, hospital, or ambulance affiliation is implied.
- [ ] No access code, number, token, ID, provider dashboard, or private transcript
  is visible.
- [ ] Captions match narration and remain legible on mobile playback.
- [ ] Public video plays in a signed-out browser.
