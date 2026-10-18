// OWNER: Member 2 (shared) - types text out letter by letter, with a blinking caret while it types.
// The full text is reserved underneath (invisible) so the layout never jumps, and screen readers get it whole.
// With reduced motion on, the text appears at once.
"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Typewriter({ text, start = true, speed = 45, delay = 0, onDone, className }:
  { text: string; start?: boolean; speed?: number; delay?: number; onDone?: () => void; className?: string }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!start) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setN(text.length); onDone?.(); return; }
    setN(0);
    let i = 0;
    let timer: number;
    const tick = () => {
      i += 1; setN(i);
      if (i < text.length) timer = window.setTimeout(tick, speed + (text[i - 1] === " " ? speed : 0)); // a beat between words
      else onDone?.();
    };
    timer = window.setTimeout(tick, delay);
    return () => window.clearTimeout(timer);
  }, [text, start]); // eslint-disable-line react-hooks/exhaustive-deps

  const typing = start && n < text.length;
  return (
    <span className={cn("relative inline-grid", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">{text}</span>
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {text.slice(0, n)}{typing && <span className="pz-caret" />}
      </span>
    </span>
  );
}
