# Pulse UI direction

Generated with the built-in OpenAI image-generation tool on 22 July 2026. The first two directions were created from the written product brief only; no existing Pulse screenshots or other image references were supplied.

These boards are design references, not runtime assets. Implement the hierarchy, spacing, palette, component silhouettes, and responsive behavior in accessible React and CSS. Do not embed the boards in the product or copy incidental generated claims.

## Artifacts

- `direction-a-calm-coordination.png` — independent clean-sheet direction A, 1536 × 1024
- `direction-b-operational-clarity.png` — independent clean-sheet direction B, 1637 × 960
- `final-mobile-reference.png` — selected five-state mobile system, 1694 × 928
- `final-desktop-reference.png` — responsive desktop review state, 1586 × 992

## Direction score

| Criterion | Weight | Direction A | Direction B |
|---|---:|---:|---:|
| First action is immediately obvious | 20 | 20 | 19 |
| Controlled-prototype boundary is unmistakable | 15 | 15 | 13 |
| Calmness and trust | 15 | 15 | 13 |
| Dispatch states cannot be confused | 15 | 11 | 15 |
| Works realistically at 320–390 px | 15 | 13 | 14 |
| Accessibility and text contrast | 10 | 8 | 9 |
| Can be implemented quickly without raster tricks | 10 | 8 | 10 |
| **Total** | **100** | **90** | **93** |

## Selection rationale

Direction B is the base because it gives dispatch progress and evidence a stronger, more legible hierarchy. Its step rail, compact data rhythm, restrained borders, and explicit timeline map cleanly to ordinary semantic HTML and CSS. Direction A is warmer and communicates the public-emergency boundary more explicitly, so the final system borrows its warm canvas, more human spacing, and persistent 995 treatment.

The resulting direction should feel like calm civic infrastructure: composed enough to build trust, operational enough to make state changes unmistakable, and simple enough for a stressed bystander to scan with one hand.

## Implementation anchors

- Use a warm off-white application canvas, white cards, graphite text, deep navy for information, restrained pulse red for primary actions and the 995 escape, amber for pending/unknown, and green only for recipient-verified evidence.
- Maintain a compact global header and three-step progress rail. On mobile, keep one obvious action near the bottom of each state. On desktop, use a 720–760 px task column and a separate 320–360 px context rail.
- Keep headings strong but compact. The desktop page heading should be about 40–44 px; mobile screen headings should remain in the 28–36 px range. Body copy should visually match at least 16 px.
- Use 48 px minimum interactive targets, 20–24 px card radii, fine neutral borders, little or no shadow, and a consistent outline-icon weight.
- Put active dispatch progress and evidence above all secondary incident context.
- Preserve the 995 escape on every state without presenting it as a second Pulse workflow.
- Unknown values always stay visibly amber and textual. A provider call completing must not become a green outcome by itself.
- The review confirmation must begin unchecked. The image board's checked state only illustrates placement.
- Generated mockup copy is not source-of-truth product copy. In particular, do not implement claims that voice/text “stay with your report,” unsupported incident attributes, generated report IDs, photos/media capture, or statements that a coordinator will assign something.
- Do not add photography, a fake map, hospital branding, medical diagnosis, treatment instructions, capability labels, ambulance assignment, or ETA claims.

## Exact prompts

### Direction A — calm human coordination

```text
Use case: ui-mockup
Asset type: clean-sheet high-fidelity mobile web application design board
Primary request: Create an original shippable interface direction for “Pulse”, a bystander-first incident reporting and controlled dispatch handoff product. This is Direction A: calm human coordination. This must be new work based only on this written brief, with no reference to any existing product screenshot.
Scene/backdrop: a single warm off-white presentation canvas containing four complete portrait mobile screens side-by-side, with clear separation and no phone hardware frames
Subject: Four realistic 390×844 mobile web screens in order: landing, incident capture, report review, and dispatch evidence result
Style/medium: polished production UI, calm modern civic technology, human, serious, trustworthy and operational; ordinary HTML/CSS-feasible components; not concept art
Composition/framing: entire four-screen board visible; each screen has one clear primary action, large touch targets, short scanning paths, generous whitespace, high legibility, persistent safety escape, compact progress indicators, rounded white panels, restrained fine borders
Lighting/mood: calm and reassuring, urgent without panic
Color palette: warm neutral canvas, white surfaces, near-black typography, restrained pulse-red primary action, signal-blue information, amber only for pending or unknown, green only for explicitly verified evidence
Text (verbatim): “PULSE”, “Controlled prototype”, “Call 995 for a real emergency”, “In an accident, every clear detail matters.”, “Start controlled dispatch”, “Tell Pulse what happened”, “Use my location”, “Type instead”, “Review report”, “Check every detail”, “Structured with GPT-5.6”, “Controlled dispatch desk”, “Desk received the brief”, “Assignment not confirmed”
Screen details: Landing visibly explains Capture, Review, Connect and clearly states Pulse does not contact public emergency services. Capture has location and editable incident report with microphone/type choice. Review has editable witness report, observational GPT-5.6 brief, and an explicit fixed controlled-desk destination. Result prioritizes a receipt/evidence table where unknown stays amber and success is not implied.
Typography: crisp accessible modern sans-serif, strong but not oversized headings, minimum body-text appearance equivalent to 16px
Constraints: large 48px-equivalent controls; realistic responsive implementation; strong contrast; no misleading medical diagnosis labels; no ambulance or hospital acceptance claim; no fake map; no patient photography; no decorative illustrations; no logos except the original simple Pulse wordmark; no trademarks; no watermark; no extra product features
Avoid: glassmorphism, gradients behind text, tiny chips, excessive red, dark tactical dashboard, hospital portal styling, generic AI chatbot styling, ride-hailing styling, alarm-screen styling, marketing-landing-page spectacle, 3D devices, illegible decorative text
```

### Direction B — operational clarity

```text
Use case: ui-mockup
Asset type: clean-sheet high-fidelity mobile web application design board
Primary request: Create an original shippable interface direction for “Pulse”, a bystander-first incident reporting and controlled dispatch handoff product. This is Direction B: operational clarity. This must be new work based only on this written brief, with no reference to any existing product screenshot or to another generated direction.
Scene/backdrop: one clean light-neutral presentation canvas containing four complete portrait mobile screens side-by-side, separated cleanly and shown without phone hardware frames
Subject: Four realistic 390×844 mobile web screens in order: landing, incident capture, report review, and dispatch evidence result
Style/medium: disciplined production UI for modern civic operations, high-trust, compact but readable, sober and humane; feasible with conventional React and CSS; not concept art
Composition/framing: entire four-screen board visible; stronger operational hierarchy, restrained card decoration, clear section rails, prominent step progress and evidence timeline, highly readable dense receipt, one decisive primary action per screen, large touch targets
Lighting/mood: composed, focused, reliable, urgent without alarm
Color palette: quiet warm gray canvas, crisp white surfaces, graphite text, deep navy informational accents, restrained vermilion primary action and emergency escape, amber for pending/unknown, green only for explicit recipient-verified evidence
Text (verbatim): “PULSE”, “Controlled prototype”, “Call 995 for a real emergency”, “In an accident, every clear detail matters.”, “Start controlled dispatch”, “Step 1 of 3”, “Capture the incident”, “Use my location”, “Tell Pulse what happened”, “Review report”, “Check every detail”, “Structured with GPT-5.6”, “Who will be contacted”, “Pulse Controlled Dispatch Desk”, “Dispatch evidence”, “Desk received the brief”, “Assignment not confirmed”
Screen details: Landing has a compact trust statement, three numbered steps and visible 995 escape. Capture combines a location module, editable incident report and microphone/type controls without blocking either mode. Review presents editable witness report, concise structured observation fields, explicit fixed dispatch desk and send confirmation. Result puts the outcome banner, five-step timeline and field-by-field evidence receipt above secondary incident details. Unknown evidence is visible and amber.
Typography: precise accessible modern sans-serif with tabular/data-friendly rhythm, strong headings no larger than needed, body-text appearance equivalent to 16px
Constraints: 48px-equivalent controls; practical layout at 320–390px; strong contrast; no diagnosis labels; no medical advice; no ambulance/hospital acceptance claims; no fake map; no photos; no decorative illustration; no trademarks; no watermark; no extra features
Avoid: glassmorphism, gradients behind text, ornamental shadows, tiny badges, excessive red, dark mode, command-center/tactical styling, hospital portal styling, generic AI chat layout, ride-hailing styling, marketing spectacle, 3D device frames, illegible microcopy
```

### Final mobile reference

Image 1 role: `direction-b-operational-clarity.png` is the selected visual-direction reference.

```text
Use case: ui-mockup
Asset type: final high-fidelity five-screen mobile web application reference board
Input images: Image 1 is the selected visual-direction reference. Use its disciplined operational hierarchy, navy information language, crisp white surfaces, fine borders, step rail, evidence timeline, and restrained civic-tech character. This is generation of a new complete board, not a text edit.
Primary request: Create the final internally consistent mobile UI reference system for Pulse, a bystander-first controlled dispatch prototype. Show five complete 390×844 screens in order: Landing, Capture, Review, Connecting, Result.
Scene/backdrop: a quiet warm off-white presentation canvas, five portrait screens side-by-side without phone hardware frames
Style/medium: shippable production UI feasible in React and CSS; calm modern civic technology; serious, human and operational
Composition/framing: entire five-screen board visible; identical app shell and spacing system; consistent palette, typography, 20–24px card radius, button treatment, fine borders, icon weight, progress rail and density. One obvious primary action per state. Keep critical progress and evidence above secondary details.
Color palette: warm off-white canvas, pure white surfaces, graphite typography, deep navy information, restrained pulse-red only for primary action and 995 emergency escape, amber only for pending or unknown, green only for explicitly recipient-verified evidence
Typography: accessible modern sans-serif, high legibility, strong compact headings, body-text appearance equivalent to 16px
Text (verbatim, render accurately and no substitutes):
Screen 1: “PULSE”, “Controlled prototype”, “In an accident, every clear detail matters.”, “Tell Pulse what happened. Review the report. Then send it to our authorized controlled dispatch desk.”, “Start controlled dispatch”, “Call 995 for a real emergency”, “Pulse does not contact public emergency services.”
Screen 2: “Step 1 of 3”, “Capture the incident”, “Use my location”, “Or enter an address, postal code, or landmark”, “Tell Pulse what happened”, “Use microphone”, “Type instead”, “Review report”
Screen 3: “Step 2 of 3”, “Check every detail”, “Witness report”, “What Pulse understood”, “Structured with GPT-5.6”, “Who will be contacted”, “Pulse Controlled Dispatch Desk”, “I reviewed the report and location.”, “Send to controlled desk”
Screen 4: “Step 3 of 3”, “Connecting to the controlled desk”, “Report reviewed”, “Dispatch brief sent”, “Desk call started”, “Desk response received”, “Evidence checked”, “Calling the controlled desk”
Screen 5: “Desk received the brief”, “Vehicle assignment was not confirmed.”, “Dispatch evidence”, “Brief received”, “Vehicle assigned”, “Destination”, “ETA”, “Unknown”, “Start a new controlled report”
Detailed behavior depiction:
- Landing uses a compact three-step Capture / Review / Connect explanation and a visible controlled-prototype boundary.
- Capture permits either device location or a manual Singapore address and shows an always-editable report area with mic/type choices.
- Review presents an editable witness report, concise observational GPT-5.6 fields with Unknown values allowed, fixed controlled-desk destination, review checkbox and send action.
- Connecting places a five-stage status timeline first, with active calling state and no success color.
- Result has an amber receipt-only outcome and field-by-field evidence table; brief received may be explicitly verified but vehicle assignment, destination and ETA remain Unknown; the result must not imply ambulance dispatch.
Constraints: preserve the visual language of Image 1 while improving warmth and adding a persistent 995 safety action; 48px-equivalent controls; realistic at 320–390px; strong contrast; no diagnosis, no treatment advice, no hospital capability claim, no ambulance acceptance claim, no fake map, no photography, no decorative illustration, no map background, no hospital logo, no trademarks, no watermark, no extra product features
Avoid: glassmorphism, decorative gradients, tiny chips, excessive red, dark tactical UI, hospital-portal styling, AI-chat styling, ride-hailing styling, marketing spectacle, 3D device frames, success implied by provider completion
```

### Final desktop reference

Image 1 role: `final-mobile-reference.png` is the final mobile visual-system reference.

```text
Use case: ui-mockup
Asset type: final high-fidelity responsive desktop web application reference board
Input images: Image 1 is the final five-screen Pulse mobile reference. Preserve its palette, typography, fine borders, icon style, compact progress rail, restrained pulse-red actions, navy information language, white surfaces, amber unknown states, and calm civic-technology character. Translate the system to desktop; do not merely stretch a mobile screen.
Primary request: Create one complete 1440×900 desktop web application screen for the Pulse “Check every detail” review state, with enough supporting layout cues to guide responsive implementation.
Scene/backdrop: full browser viewport on a warm off-white application canvas; no device frame, no browser chrome
Style/medium: shippable accessible production UI feasible with conventional React and CSS, serious and humane
Composition/framing: centered application shell with maximum width about 1180px. Compact global header across the top with Pulse identity, “Controlled prototype”, progress context, and persistent “Call 995” escape. Under it, a two-column layout: main task column 720px–760px and secondary context rail 320px–360px with a generous 28px–32px gap. Main column contains review heading, editable witness report, concise GPT-5.6 observation brief and final review confirmation with the red send action visible above the fold. Secondary rail contains fixed controlled-desk destination, location included in the report, optional nearby-care unavailable context, and the real-emergency 995 safety boundary. Do not place two-column card grids inside the narrow rail.
Color palette: exactly aligned to Image 1 — warm off-white canvas, crisp white surfaces, graphite text, deep navy information, restrained pulse-red only for primary action and emergency escape, amber unknown, green only for recipient-verified evidence
Typography: accessible modern sans-serif; page heading about 40px–44px and no more than two lines; body appearance 16px; compact data labels 14px; strong hierarchy without a giant marketing headline
Text (verbatim):
“PULSE”
“Controlled prototype”
“Step 2 of 3”
“Check every detail”
“Review and correct every detail before anything is sent.”
“Witness report”
“I saw a car and a two-wheeler collide at the intersection. The car was turning right. The rider fell on the road.”
“Edit report”
“What Pulse understood”
“Structured with GPT-5.6”
“Incident type”
“Vehicle collision”
“Consciousness”
“Unknown”
“Breathing”
“Unknown”
“Visible bleeding”
“Unknown”
“Missing information”
“Who will be contacted”
“Pulse Controlled Dispatch Desk”
“This is our authorized test desk, not a public emergency service.”
“Location included in this report”
“Marina Bay Sands, 018956”
“Nearby hospital data is unavailable”
“The controlled desk will confirm any destination.”
“I reviewed the report and location.”
“Send to controlled desk”
“Call 995 for a real emergency”
“Pulse does not contact SCDF or public emergency services.”
Constraints: primary action visible without scrolling; calm density; 48px-equivalent controls; clear keyboard-focus treatment; strong contrast; unknown fields remain amber; no success state on this page; no diagnosis or treatment advice; no ambulance or hospital acceptance claim; no fake map; no photos; no decorative illustration; no hospital logos; no trademarks; no watermark; no extra features
Avoid: stretched mobile cards, giant hero headline, full-width content, narrow internal two-column grids, dashboard clutter, excessive red, glassmorphism, gradients behind text, dark tactical design, generic AI chat layout, ride-hailing styling, marketing spectacle, 3D device frames
```
