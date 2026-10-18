// OWNER: Member 2 - face icons for diary feelings (Lucide; no emoji per the brand).
import { Frown, Laugh, Meh, Smile, Thermometer } from "lucide-react";
import type { Mood } from "@/lib/diary";

const ICONS = { Great: Laugh, Good: Smile, Okay: Meh, Low: Frown, Unwell: Thermometer } as const;
export function MoodIcon({ mood, size = 24 }: { mood: Mood; size?: number }) {
  const I = ICONS[mood];
  return <I aria-hidden="true" size={size} />;
}
