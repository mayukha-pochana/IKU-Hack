# Brand kit — PhaseZero

The frontend uses the **PhaseZero design system**: https://claude.ai/artifact/KFUiGpp3rkUzRoYdidtcTT
That page is the source of truth for voice, colour, type, components and logo rules. Read it before changing UI.

## Where it lives in the code
| What | File |
|---|---|
| Colour, spacing, radius, shadow tokens (light + `.dark`) and all `pz-*` component classes | `frontend/src/app/globals.css` |
| Tailwind names for the tokens (`bg-violet`, `text-ink-muted`, `text-h1`, `rounded-lg`…) | `frontend/tailwind.config.ts` |
| Lexend font (400/500/600) | `frontend/src/app/layout.tsx` |
| Logo files, copied unchanged | `frontend/public/brand/phasezero-*.svg`, favicon `frontend/src/app/icon.svg` |
| `<Logo />`, product name and tagline | `frontend/src/components/brand/Logo.tsx` |
| React wrappers: `Badge`, `MatchBadge`, `DoseBadge`, `Notice`, `Loader`, `Stepper`, `Chip`, `Segmented`, `TextField`, `Toggle`, `Tablet` | `frontend/src/components/ui/pz.tsx` |
| Read aloud (ElevenLabs) button | `frontend/src/components/ui/ReadAloud.tsx` |

## Rules that bite most often
- Sentence case everywhere, buttons are 1–3 word verbs ("Get started", "Mark taken").
- Never "eligible" or "you qualify". Use "Possible match" / "Needs more info" / "Not a match", and keep the eligibility notice on every trial screen.
- No invented numbers or match percentages. Adherence is always "marked taken", never verified.
- 24-hour times and UK dates via `frontend/src/lib/format.ts`.
- Status = icon + word + colour, never colour alone. One primary button per screen.
- Tailwind utilities load before the `pz-*` classes, so a utility that fights a `pz-*` property loses. Use a wrapper element or an inline style in that case.
