// OWNER: Member 2 - diary feelings as small soft "blob" faces in pastel brand tones (no emoji per the brand).
import { useId } from "react";
import type { Mood } from "@/lib/diary";
import { cn } from "@/lib/utils";

/** Blob colours (light centre -> base), a deep shade for rings/text, a soft tint for selected pills, and a kind line. */
export const MOOD_STYLE: Record<Mood, { light: string; base: string; deep: string; tint: string; line: string }> = {
  Great: { light: "#c9f6e6", base: "#5fd3ad", deep: "#0b7a5c", tint: "#e6faf3", line: "Love that. Enjoy the good day." },
  Good: { light: "#d7e9fd", base: "#82b9f2", deep: "#2f6fb0", tint: "#ecf4fe", line: "Nice. Thanks for checking in." },
  Okay: { light: "#fff1c2", base: "#f4cf5d", deep: "#8a6206", tint: "#fff8e1", line: "Thanks for checking in. Steady days count too." },
  Low: { light: "#e6defd", base: "#ab97ef", deep: "#5a46b8", tint: "#f1edfd", line: "Sorry you're feeling low. A short note can help you spot patterns over time." },
  Unwell: { light: "#ffe0d1", base: "#f59a76", deep: "#a3502a", tint: "#fff0e8", line: "Sorry you're unwell. If you're worried, contact your GP or call 111. In an emergency, call 999." },
};

const INK = "#2b2840";

/** Tiny face drawn on a 40x40 circle. */
function Face({ mood }: { mood: Mood }) {
  const eyes = <><circle cx="15.5" cy="18" r="1.9" fill={INK} /><circle cx="24.5" cy="18" r="1.9" fill={INK} /></>;
  switch (mood) {
    case "Great": return (<><path d="M13 18q2.5-3 5 0M22 18q2.5-3 5 0" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" /><path d="M14.5 23.5h11a5.5 5.5 0 0 1-11 0z" fill={INK} /></>);
    case "Good": return (<>{eyes}<path d="M15 24q5 4 10 0" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" /></>);
    case "Okay": return (<>{eyes}<path d="M15.5 25h9" stroke={INK} strokeWidth="1.9" strokeLinecap="round" /></>);
    case "Low": return (<>{eyes}<path d="M15.5 27q4.5-3.5 9 0" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" /></>);
    case "Unwell": return (<><path d="M13.5 18q2 1.6 4 0M22.5 18q2 1.6 4 0" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" /><path d="M14.5 26q1.8-2 3.7 0t3.6 0 3.7 0" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" /></>);
  }
}

export function MoodFace({ mood, size = 40, className }: { mood: Mood; size?: number; className?: string }) {
  const s = MOOD_STYLE[mood];
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={cn("shrink-0", className)}>
      <defs>
        <radialGradient id={`g${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={s.light} /><stop offset="100%" stopColor={s.base} />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#g${id})`} />
      <ellipse cx="14" cy="11.5" rx="4.5" ry="2.6" fill="#fff" opacity=".45" transform="rotate(-25 14 11.5)" />
      <Face mood={mood} />
    </svg>
  );
}

/** Kept for existing callers (badges): the face at icon size. */
export function MoodIcon({ mood, size = 24 }: { mood: Mood; size?: number }) {
  return <MoodFace mood={mood} size={size} />;
}
