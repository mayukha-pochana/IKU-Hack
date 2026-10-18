// OWNER: Member 2 - compact "Phase" dropdown for the trials filter bar. Empty selection means any phase.
"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhaseInfo } from "@/components/ui/InfoTip";

export const ALL_PHASES = ["Early phase 1", "Phase 1", "Phase 2", "Phase 3", "Phase 4", "No phase"];

export function PhaseFilter({ selected, onChange, count }: { selected: string[]; onChange: (v: string[]) => void; count: (p: string) => number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const label = selected.length === 0 ? "Any" : selected.length === 1 ? selected[0] : `${selected.length} phases`;
  const toggle = (p: string) => onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);

  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
        className={cn("inline-flex h-10 items-center gap-1.5 rounded-pill border-[1.5px] px-3 text-label transition-colors sm:gap-2 sm:px-4",
          selected.length ? "border-violet bg-violet text-violet-on" : "border-line-strong bg-surface-raised text-ink hover:border-violet")}>
        <span className="font-normal opacity-80 sm:inline">Phase</span>
        {selected.length > 0 && <span className="rounded-pill bg-white/20 px-1.5 text-[13px] leading-5 sm:hidden">{selected.length}</span>}
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown aria-hidden="true" size={16} className={cn("transition-transform duration-300", open && "rotate-180")} />
      </button>
      {open && (
        <div id={id} role="dialog" aria-label="Filter by phase"
          className="pz-pop absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-line bg-surface-raised p-2 shadow-[0_16px_40px_rgba(28,26,51,0.16)]">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="flex items-center gap-1 text-label">Trial phase <PhaseInfo /></span>
            {selected.length > 0 && <button type="button" className="pz-link text-label" onClick={() => onChange([])}>Clear</button>}
          </div>
          <ul className="flex flex-col">
            {ALL_PHASES.map((p) => {
              const n = count(p);
              return (
                <li key={p}>
                  <label className={cn("flex min-h-tap cursor-pointer items-center gap-3 rounded-md px-2", n === 0 ? "cursor-default opacity-50" : "hover:bg-violet-soft")}>
                    <input type="checkbox" className="h-5 w-5 accent-[var(--violet)]" checked={selected.includes(p)} disabled={n === 0} onChange={() => toggle(p)} />
                    <span className="flex-1">{p}</span>
                    <span className="text-label font-normal text-ink-muted">{n}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
