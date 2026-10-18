// OWNER: Member 2 (shared) - small decorative pastel illustrations in a soft, hand-drawn style.
// Purely decorative: always aria-hidden. Use sparingly, one per card at most.
import { cn } from "@/lib/utils";

type P = { className?: string; size?: number };

/** A young sprig with two leaves, mint and lavender. */
export function SprigDoodle({ className, size = 72 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" className={cn("pointer-events-none", className)}>
      <path d="M36 66C35 52 36 40 38 28" stroke="#5fb894" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M37 44C27 44 18 37 16 27c10-1 19 5 21 17z" fill="#a8ead1" />
      <path d="M37 44C27 44 18 37 16 27" stroke="#5fb894" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".7" />
      <path d="M38 32c3-11 12-18 22-17-1 11-10 18-22 17z" fill="#cdbff8" />
      <path d="M38 32c3-11 12-18 22-17" stroke="#8f7bd6" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".6" />
      <circle cx="58" cy="44" r="2" fill="#f7b3c6" /><circle cx="14" cy="50" r="1.6" fill="#f4cf5d" />
    </svg>
  );
}

/** A soft pink heart with a little heartbeat squiggle. */
export function HeartDoodle({ className, size = 64 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={cn("pointer-events-none", className)}>
      <path d="M32 54C18 45 9 36 9 25a11 11 0 0 1 23-6 11 11 0 0 1 23 6c0 11-9 20-23 29z" fill="#ffc6d6" />
      <path d="M32 54C18 45 9 36 9 25a11 11 0 0 1 23-6" stroke="#ef8fab" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".7" />
      <path d="M15 32h9l3-6 4 11 3-7h12" stroke="#c2547f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M50 10l1.5 3.5L55 15l-3.5 1.5L50 20l-1.5-3.5L45 15l3.5-1.5z" fill="#f4cf5d" />
    </svg>
  );
}

/** A warm little sun for greetings. */
export function SunDoodle({ className, size = 20 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={cn("pointer-events-none", className)}>
      <circle cx="12" cy="12" r="5" fill="#f7c948" />
      <g stroke="#f29b3b" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      </g>
    </svg>
  );
}
