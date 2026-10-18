// OWNER: Member 2 - one confirmed medication as a compact row: route-coloured icon, name and instructions,
// the schedule as a small chip, "Log" for when-needed medicines (scheduled ones are logged in the blister pack),
// and "Stop taking" tucked in the ⋯ menu (future doses are removed; past history is kept).
// Tap the card (or its "Tap to flip" hint) to flip it: the back explains, in plain words, how this medicine is taken, and links to its
// NHS.UK page for what it's for. We don't write our own medical descriptions.
"use client";
import { useEffect, useRef, useState } from "react";
import { Check, CircleOff, Clock, Droplet, ExternalLink, MoreHorizontal, Pill, Plus, RotateCcw, RotateCw, Syringe, Wind } from "lucide-react";
import { medications } from "@/lib/api";
import type { Medication } from "@/types";
import { Notice, Spinner, errorMessage } from "@/components/ui/pz";
import { describeSchedule } from "@/lib/schedule";
import { dateTimeUK, time24 } from "@/lib/format";
import { routeOf, type Route } from "@/lib/route";
import { colourFor } from "./MedicationCalendar";

const ROUTE_ICON: Record<Route, typeof Pill> = { enteral: Pill, pulmonary: Wind, topical: Droplet, parenteral: Syringe };
// How each kind of medicine is taken, in plain words (about the route only, never the drug itself).
const ROUTE_ABOUT: Record<Route, { kind: string; how: string }> = {
  enteral: { kind: "A medicine you swallow", how: "Tablets, capsules or liquids go through your stomach into your bloodstream." },
  pulmonary: { kind: "A medicine you breathe in", how: "Inhalers send the medicine straight to your airways and lungs." },
  topical: { kind: "A medicine you put on your body", how: "Creams, drops and sprays work where you put them: on the skin, eyes, ears or nose." },
  parenteral: { kind: "An injection", how: "Given under the skin or into a muscle or vein, so it reaches your bloodstream directly." },
};
// React 18 only renders `inert` as an empty-string attribute; it keeps the hidden face out of tab order.
const inert = (on: boolean) => (on ? ({ inert: "" } as Record<string, string>) : {});
const nhsSearch = (name: string) => `https://www.nhs.uk/search/results?q=${encodeURIComponent(name)}`;

export function MedicationCard({ med, onChanged }: { med: Medication; onChanged?: () => void }) {
  const s = med.confirmed_schedule;
  const asNeeded = s.pattern === "as_needed";
  const route = routeOf(med.name, med.instructions);
  const colour = colourFor(route, 0);
  const Icon = ROUTE_ICON[route];
  const [busy, setBusy] = useState<"log" | "stop" | null>(null);
  const [logged, setLogged] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const menuBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuBox.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [menu]);

  async function logDose() {
    setBusy("log"); setErr(null);
    try { const d = await medications.logDose(med.id); setLogged(time24(d.scheduled_at)); onChanged?.(); }
    catch (e) { setErr(errorMessage(e, "Couldn't log that dose. Try again.")); }
    finally { setBusy(null); }
  }

  async function stop() {
    setBusy("stop"); setErr(null);
    try { await medications.stop(med.id); setConfirmStop(false); onChanged?.(); }
    catch (e) { setErr(errorMessage(e, "Couldn't stop that medicine. Try again.")); }
    finally { setBusy(null); }
  }

  const about = ROUTE_ABOUT[route];
  // Tap anywhere on the card to flip it; buttons and links inside keep doing their own thing.
  const flipOnTap = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest("button, a, input, [role=menu]")) setFlipped((f) => !f); };
  const face = "flex flex-col gap-3 rounded-[22px] border border-line p-4 shadow-[0_4px_16px_rgba(59,47,143,0.05)]";
  return (
    <article className={`flex flex-col gap-3 ${s.stopped_at ? "opacity-70" : ""}`} aria-label={med.name}>
     <div className="pz-flip" data-flipped={flipped}>
      <div className="pz-flip__inner">
      {/* Front */}
      <div className={`pz-flip__face cursor-pointer bg-surface-raised ${face}`} onClick={flipOnTap} aria-hidden={flipped} {...inert(flipped)}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ background: colour.light, color: colour.deep }}>
          <Icon aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-6">{med.name}{med.strength && <span className="font-normal text-ink-muted"> {med.strength}</span>}</h3>
          {med.instructions && <p className="line-clamp-2 text-label font-normal text-ink-muted">{med.instructions}</p>}
        </div>
        {!s.stopped_at && (
          <div ref={menuBox} className="relative -mr-1 -mt-1 shrink-0">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-pill text-ink-muted transition-colors hover:bg-violet-soft hover:text-ink"
              aria-label={`More options for ${med.name}`} aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <MoreHorizontal aria-hidden="true" size={20} />
            </button>
            {menu && (
              <div role="menu" className="pz-pop absolute right-0 top-full z-20 mt-1 w-44 rounded-[16px] border border-line bg-surface-raised p-1 shadow-[0_12px_32px_rgba(28,26,51,0.14)]">
                <button type="button" role="menuitem" className="flex min-h-tap w-full items-center gap-2 rounded-[12px] px-3 text-left text-label text-danger hover:bg-violet-soft"
                  onClick={() => { setMenu(false); setConfirmStop(true); }}>
                  <CircleOff aria-hidden="true" size={16} />Stop taking
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fills the space on the front and says the card flips. */}
      <div className="flex flex-1 items-center">
        <button type="button" onClick={() => setFlipped(true)} aria-label={`Flip to learn more about ${med.name}`}
          className="pz-flip-hint inline-flex items-center gap-1.5 rounded-pill bg-violet-soft px-3 py-1.5 text-caption font-semibold text-violet-text transition-colors hover:bg-violet hover:text-violet-on">
          <RotateCw aria-hidden="true" size={14} />Tap to flip and learn more
        </button>
      </div>
      {s.stopped_at ? (
        <p className="pz-badge pz-badge--neutral self-start"><CircleOff aria-hidden="true" strokeWidth={2.5} />Stopped {dateTimeUK(s.stopped_at)}</p>
      ) : (
        <div className="flex items-center gap-2">
          <span className="mr-auto inline-flex min-w-0 items-start gap-1.5 rounded-[12px] bg-surface px-3 py-1.5 text-caption text-ink-muted shadow-[inset_0_0_0_1px_var(--line)]">
            <Clock aria-hidden="true" size={13} className="mt-[3px] shrink-0" /><span>{describeSchedule(s)}</span>
          </span>
          {asNeeded && (logged ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-caption font-medium text-mint-text" role="status"><Check aria-hidden="true" size={14} />Logged {logged}</span>
          ) : (
            <button type="button" onClick={logDose} disabled={!!busy} aria-busy={busy === "log"}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-pill bg-violet px-3.5 text-label text-violet-on shadow-[0_4px_12px_rgba(59,47,143,0.25)] transition-transform active:scale-95 disabled:opacity-60">
              {busy === "log" ? <Spinner /> : <Plus aria-hidden="true" size={16} />}Log dose
            </button>
          ))}
        </div>
      )}
      </div>

      {/* Back: plain-words explanation and where to read more. White, with one soft accent, so it reads easily. */}
      <div className={`pz-flip__face pz-flip__back cursor-pointer bg-surface-raised ${face}`} onClick={flipOnTap}
        aria-hidden={!flipped} {...inert(!flipped)}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ background: colour.light, color: colour.deep }}>
            <Icon aria-hidden="true" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-6">{med.name}{med.strength && <span className="font-normal text-ink-muted"> {med.strength}</span>}</h3>
            <p className="text-label font-medium" style={{ color: colour.deep }}>{about.kind}</p>
          </div>
          <button type="button" onClick={() => setFlipped(false)} aria-label={`Back to ${med.name}`} title="Flip back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-violet-soft text-violet-text transition-colors hover:bg-violet hover:text-violet-on">
            <RotateCcw aria-hidden="true" size={16} />
          </button>
        </div>
        <p className="text-label font-normal leading-6 text-ink">{about.how} <span className="text-ink-muted">Unsure about yours? Ask your pharmacist.</span></p>
        <div className="mt-auto flex items-center border-t border-line pt-3">
          <a href={nhsSearch(med.name)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-label font-semibold text-violet-text">
            What it&apos;s for on NHS.UK<ExternalLink aria-hidden="true" size={14} />
          </a>
        </div>
      </div>
      </div>
     </div>

      {confirmStop && (
        <div className="pz-soft-card pz-soft-card--pink flex flex-col gap-2 !p-3" role="group" aria-label={`Stop taking ${med.name}`}>
          <p className="text-label">Stop {med.name}? Upcoming doses are removed. Doses you&apos;ve already logged stay.</p>
          <p className="text-caption text-ink-muted">Only stop a medicine if your doctor or pharmacist has told you to, or you haven&apos;t started it.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="pz-btn pz-btn--secondary pz-btn--sm" onClick={stop} disabled={!!busy} aria-busy={busy === "stop"}>
              {busy === "stop" ? <Spinner /> : <CircleOff aria-hidden="true" size={16} />}Yes, stop it
            </button>
            <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" onClick={() => setConfirmStop(false)} disabled={!!busy}>Cancel</button>
          </div>
        </div>
      )}
      {err && <Notice tone="danger">{err}</Notice>}
    </article>
  );
}
