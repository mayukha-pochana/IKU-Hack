# PhaseZero: 2-minute demo script

Everything below works end to end on the real stack (Postgres, backend, frontend, live Gemini and ClinicalTrials.gov). The patient and the pharmacy label are synthetic; the trial is real.

## Before recording
1. `docker compose up -d db`, then in `backend/`: `alembic upgrade head` and `python -m scripts.reset_demo`.
2. Backend and frontend running; `GEMINI_MODEL=gemini-3.5-flash-lite` in `backend/.env`.
3. Sign in with **Try the demo account**, open trial **NCT06897475** once so its explanation is cached, then run `reset_demo` again for a clean start.
4. Have the insulin box photo ready: `demo-assets/insulin-box-with-pharmacy-label.jpg` (on your phone, or on screen to photograph).
5. Leave a couple of seconds between steps (Gemini rate limits).

## The persona
**Maya, 52, a primary school teacher in Birmingham** (synthetic). Type 2 diabetes for three years, managed with Metformin tablets and a weekly semaglutide injection. Her blood sugar still isn't where her GP wants it. Her GP has mentioned insulin, and that clinical trials of new treatments exist, "if you want to look into it". She tried: thousands of listings, rules written for researchers, no idea which ones meant her.

**The gap:** trials need people like Maya, Maya might benefit from one, and the admin in between stops both.

## Script

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:15 | Maya (photo or illustration), then ClinicalTrials.gov results full of jargon | "This is Maya. She has type 2 diabetes, and her GP said a clinical trial might help. So she looked. Thousands of listings, rules written for researchers, and no idea which, if any, meant her." |
| 0:15–0:25 | PhaseZero logo, tagline | "Clinical trials need people like Maya, but the admin stops her before she starts. PhaseZero removes it." |
| 0:25–0:40 | Dashboard: her week of Metformin, weekly semaglutide, adherence (one missed dose), next dose | "Maya's medicines are already here: daily tablets, a weekly injection, what she's taken and what she missed. One profile, kept up to date." |
| 0:40–1:00 | Clinical trials → NCT06897475 (Birmingham, for people already on semaglutide) → plain-English requirements, "We need to check" | "From that profile, PhaseZero finds recruiting trials near her. This one runs in Birmingham, for people already on semaglutide, like Maya. Gemini turns the eligibility rules into plain English, shows what counts in her favour, and what to ask the study team." |
| 1:00–1:15 | My medications → Take photo of the insulin box → Read label → schedule (21:00 nightly, 30 days) → Confirm → calendar shows insulin | "Then her GP prescribes insulin. She photographs the box, Gemini reads the pharmacy label, and her nightly schedule builds itself. Nothing is saved until she confirms." |
| 1:15–1:30 | Dashboard: "1 trial changed" → trial card: "Not a fit right now", because the trial excludes insulin | "But PhaseZero's agent notices something she didn't know: this trial excludes people on insulin. It changes its answer and tells her why, in one sentence, before she's taken a single dose." |
| 1:30–1:45 | "Not right? Fix it" → "I'm not taking Toujeo SoloStar (Insulin Glargine)" → back to "We need to check"; then My medications → Stop taking → insulin leaves the schedule | "Maya decides to talk to her GP before starting. She tells PhaseZero she isn't taking it: one tap. The agent drops its old conclusion, trusts her latest word over the old record, and the trial comes back. She stops the medicine, and her schedule updates too." |
| 1:45–1:55 | Daily diary → save an entry with Presage heart rate → "Your trial matches didn't change." | "Every day she can log how she feels, with heart and breathing rate from her camera via Presage. The agent treats camera readings as supporting evidence only, and doesn't re-check trials that don't depend on them." |
| 1:55–2:00 | Dashboard, tagline | "One profile. Matches that keep up with her. Less admin, more participation. That's PhaseZero." |

## What each part shows judges
- **Wise, Max Ease:** each scene removes a step Maya would otherwise do herself (typing, searching, decoding rules, re-checking eligibility, keeping her records consistent). Count the taps in the recording and put the number on a slide; don't invent percentages.
- **incident.io, adaptable agents:** new data (insulin) changes a conclusion with a reason; a corrected assumption (not taking it) reverses it; sources are weighed (her latest word over the record; camera readings never rule her out); no stalling (if Gemini is slow it still answers and says "we'll double-check").
- **Gemini:** reads a real photo of a pharmacy label, explains trial eligibility, understands corrections.
- **Presage:** daily check-ins with a clear, honest role.

## Honesty rules for the recording
- Say or caption "synthetic patient" once; keep the "SYNTHETIC DEMO" text on the label visible.
- Never say Maya *is* eligible: the app says "We need to check" and "the study team decides".
- Credit the box photo: "Insulin box photo: Tomino de WS, CC BY-SA 4.0 (modified)".
