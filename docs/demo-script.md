# PhaseZero: 2-minute demo script

**The pitch in one line:** healthcare runs on handoffs (GP to patient, prescription to patient, patient to trial site), and the patient carries all the admin in between. PhaseZero takes that friction away. That is our **Wise "Max Ease"** story, and it gets most of the video. Gemini and the incident.io-style adaptive agent get one "how it works" minute at the end.

Everything below works end to end on the real stack (Postgres, backend, frontend, live Gemini, ClinicalTrials.gov and the Presage desktop companion). The patient and the pharmacy label are synthetic; the trial is real.

## Before recording
1. `docker compose up -d db`, then in `backend/`: `alembic upgrade head` and `python -m scripts.reset_demo`.
2. Backend and frontend running; `GEMINI_MODEL=gemini-3.5-flash-lite` in `backend/.env`.
3. Sign in with **Try the demo account**, open trial **NCT06897475** once so its explanation is cached, then run `reset_demo` again for a clean start.
4. Have the insulin box photo ready: `demo-assets/insulin-box-with-pharmacy-label.jpg` (on your phone, or on screen to photograph).
5. Presage: in `integrations/presage-desktop/`, run `npm start` (needs `.env` with `PRESAGE_API_KEY`, `PRESAGE_RESULT_SECRET` and `CAREFLOW_BACKEND_URL` pointing at the running backend). Allow the camera for it in macOS System Settings → Privacy & Security → Camera. Do one practice measurement in good, even light.
6. Leave a couple of seconds between steps (Gemini rate limits).

Presage's SDK runs on desktop (Electron/Node), not in a browser or on iOS, so the heart-rate measurement is recorded on the Mac and the reading then shows up in the phone app's diary. Say this honestly in the narration.

## The persona
**Barbara, 52, a primary school teacher in Birmingham** (synthetic). Type 2 diabetes for three years, on Metformin tablets and a weekly semaglutide injection. Her GP mentions insulin, and that clinical trials exist, "if you want to look into it". That's where the handoff ends, and where the admin lands on Barbara.

**The friction:** the GP, the pharmacy and the trial sites each hold one piece of the picture. None of them talk to each other, so Barbara has to search, decode, copy and re-check everything herself. Many people simply stop.

## Script (2:00)

### Part 1: the friction (0:00–0:20)

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:12 | Barbara (illustration), then ClinicalTrials.gov results full of jargon | "This is Barbara. Her GP said a clinical trial might help her diabetes, then the appointment ended. So she searched alone: thousands of listings, rules written for researchers." |
| 0:12–0:20 | Slide: GP → Barbara → pharmacy → trial site, with Barbara stuck in the middle holding all the paperwork | "Every handoff in healthcare leaves the admin with the patient. PhaseZero takes it away." |

### Part 2: Max Ease, friction removed (0:20–1:20)

Show each handoff as a "before / with PhaseZero" caption in the corner of the screen.

| Time | On screen | Narration | Caption |
|---|---|---|---|
| 0:20–0:35 | Clinical trials → NCT06897475 (Birmingham, for people already on semaglutide) → plain-English requirements, "We need to check", questions to ask | "GP to trial: instead of a search bar, Barbara gets recruiting trials near her, matched to what she already takes. The rules are in plain English, with what counts in her favour and what to ask the study team." | Before: search, decode criteria. Now: matched and explained. |
| 0:35–0:50 | My medications → photograph the insulin box → Read label → schedule (21:00 nightly, 30 days) → Confirm → calendar | "Pharmacy to patient: when her GP prescribes insulin, she photographs the box. The label becomes a schedule. No typing. Nothing is saved until she confirms." | Before: type it in, set reminders. Now: one photo. |
| 0:50–1:05 | Dashboard: "1 trial changed" → trial card: "Not a fit right now", with the one-sentence reason → "How this answer changed" | "The handoff nobody does: a new prescription can change which trials you qualify for. No one tells the patient, or the trial site. PhaseZero does, straight away, with the reason, before her first dose." | Before: find out at screening. Now: told instantly. |
| 1:05–1:20 | Presage desktop window: Barbara's face in the oval, heart rate and breathing appear → Save. Cut to the phone: Diary → history shows the reading "Measured with Presage", then add a mood and a note → Save | "And the daily part. Instead of a separate device, Barbara looks at her laptop camera for a few seconds. Presage measures heart rate and breathing, and it lands in her diary next to how she feels. Everything a GP or study team would ask her, already in one place." | Before: extra device, paper diary. Now: a look at the camera. |

### Part 3: how it works, one minute of tech (1:20–2:00)

Faster cuts; this is where the other tracks get their moment.

| Time | On screen | Narration |
|---|---|---|
| 1:20–1:35 | "Not right? Fix it" → "I'm not taking Toujeo" → card goes back to "We need to check"; "How this answer changed" shows both steps | "Under the hood is an adaptive agent. New evidence changes its answer and it says why. When Barbara corrects it, it trusts her latest word over the old record and reverses its decision. If Gemini is slow, it still answers and says it will double-check." |
| 1:35–1:48 | Label scan result and trial explainer, zoomed on "Generated by Gemini · AI can make mistakes; check with your care team." | "Gemini reads the pharmacy label and turns eligibility rules into plain English, always labelled, always checked by Barbara before anything is saved." |
| 1:48–2:00 | Dashboard, then tagline slide | "One profile, connecting Barbara, her GP, her pharmacy and the trials that need her. Less admin, more care. That's PhaseZero." |

## Slide for the 1-minute pitch (the "rest of the features")
- **Wise, Max Ease (main):** four handoffs, four removed steps: find trials, read the label, re-check eligibility, keep a health diary. Count the real taps in your recording and put the number on the slide; don't invent percentages.
- **incident.io, adaptable agents:** new data changes a conclusion with a reason; corrections reverse it; sources are weighed (her latest word over the record; camera readings are supporting evidence and never rule her out); no stalling when the model is slow.
- **Gemini:** reads a real photo of a pharmacy label; explains trial eligibility; understands corrections. Every output is labelled as AI-generated.
- **Presage:** contactless heart rate and breathing in the daily check-in, saved only with consent, never used to rule anyone out of a trial.

## Honesty rules for the recording
- Say or caption "synthetic patient" once; keep the "SYNTHETIC DEMO" text on the label visible.
- Never say Barbara *is* eligible: the app says "We need to check" and "the study team decides".
- Presage is measured on the Mac companion. Don't show it as running on the phone.
- Credit the box photo: "Insulin box photo: Tomino de WS, CC BY-SA 4.0 (modified)".
