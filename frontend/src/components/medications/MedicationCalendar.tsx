// OWNER: Member 2 - the week as blister packs (design system: BlisterPack), one pack per medicine.
// Pop a tablet to log a dose; tap again to undo. Several medicines: swipe (or use the arrows) between packs.
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { medications, schedule } from "@/lib/api";
import { doseAmount, type DoseAmount } from "@/lib/doseAmount";
import { ROUTE_LABEL, routeOf, type Route } from "@/lib/route";
import { DoseIcon } from "./DoseIcon";
import type { Dose } from "@/types";
import { Loader, errorMessage } from "@/components/ui/pz";
import { ErrorState } from "../dashboard/ErrorState";
import { cn } from "@/lib/utils";
import { dayKey, isLaterDay, mondayOf, time24, weekdayLong, weekdayShort } from "@/lib/format";

type Row = { key: string; time: string; med: string };

/** Seven day columns, Monday to Sunday of the week containing `start`. */
export function buildWeek(doses: Dose[], start = new Date()) {
  start = mondayOf(start);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  const rowMap = new Map<string, Row>();
  const cells = new Map<string, Dose>();
  for (const d of doses) {
    const t = time24(d.scheduled_at);
    const key = `${t}|${d.medication_id}`;
    if (!rowMap.has(key)) rowMap.set(key, { key, time: t, med: d.medication_name });
    cells.set(`${key}|${dayKey(new Date(d.scheduled_at))}`, d);
  }
  const rows = [...rowMap.values()].sort((a, b) => a.time.localeCompare(b.time) || a.med.localeCompare(b.med));
  return { days, rows, cell: (r: Row, day: Date) => cells.get(`${r.key}|${dayKey(day)}`) };
}

/** Group a week of doses into one pack per medicine, in first-dose order. */
export function groupByMedicine(doses: Dose[]) {
  const map = new Map<string, { id: string; name: string; doses: Dose[] }>();
  for (const d of [...doses].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))) {
    if (!map.has(d.medication_id)) map.set(d.medication_id, { id: d.medication_id, name: d.medication_name, doses: [] });
    map.get(d.medication_id)!.doses.push(d);
  }
  return [...map.values()];
}

// Colour by how the medicine is taken: inhalers blue, injections amber, creams peach, tablets mint (then pink, lilac).
type Colour = { body: string; deep: string; light: string };
const C: Record<string, Colour> = {
  mint: { body: "#3cc8a1", deep: "#2fa886", light: "#4fd3ae" },
  sky: { body: "#7ab8f5", deep: "#4f93d6", light: "#9fccf8" },
  amber: { body: "#f5b94a", deep: "#d6942a", light: "#f8cf7d" },
  peach: { body: "#f5a67c", deep: "#d9825a", light: "#f9c3a5" },
  pink: { body: "#ee9cc4", deep: "#d1739f", light: "#f5bdd8" },
  lilac: { body: "#b9a7f2", deep: "#8f7bd6", light: "#d0c4f7" },
};
const ROUTE_COLOURS: Record<Route, Colour[]> = {
  enteral: [C.mint, C.pink, C.lilac],
  pulmonary: [C.sky, C.lilac],
  parenteral: [C.amber, C.pink],
  topical: [C.peach, C.pink],
};
export const colourFor = (route: Route, nth: number) => { const l = ROUTE_COLOURS[route]; return l[nth % l.length]; };
const colourVars = (c: Colour) => ({ "--mint": c.body, "--mint-deep": c.deep, "--mint-light": c.light }) as React.CSSProperties;

const ANIM_MS = 750;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Pack({ name, doses, colour, amount, route, saving, onToggle }: { name: string; doses: Dose[]; colour: Colour; amount: DoseAmount | null; route: Route; saving: string | null; onToggle: (d: Dose) => void }) {
  const [taking, setTaking] = useState<string | null>(null);
  function tap(d: Dose) {
    if (d.status === "TAKEN") { onToggle(d); return; }
    if (route === "enteral" || reducedMotion()) { onToggle(d); return; } // tablets pop straight to the tick, as in the design system
    setTaking(d.id); // play the route's animation, then log the dose
    window.setTimeout(() => { setTaking(null); onToggle(d); }, ANIM_MS);
  }
  const { days, rows, cell } = buildWeek(doses);
  const taken = doses.filter((d) => d.status === "TAKEN").length;
  const rowsStyle = { gridTemplateRows: `repeat(${rows.length}, 40px)` };
  return (
    <div className="flex flex-col items-center gap-3" style={colourVars(colour)}>
      <div className="flex flex-col items-center gap-1">
        <p className="text-h3">{name}</p>
        <span className="pz-badge pz-badge--neutral">{ROUTE_LABEL[route]}</span>
      </div>
      <div className="pz-blister max-w-full">
        <div className="pz-blister__days" aria-hidden="true">{days.map((d) => <span key={d.toISOString()} className="pz-blister__head">{weekdayShort(d).slice(0, 2)}</span>)}</div>
        <div className="pz-blister__labels" style={rowsStyle} aria-hidden="true">
          {rows.map((r) => (
            <span key={r.key} className="pz-blister__row flex-col !items-end !justify-center leading-tight">
              {r.time}{amount && <span className="text-caption font-normal">{amount.text}</span>}
            </span>
          ))}
        </div>
        <div className={cn("pz-blister__sheet", rows.length === 1 && "before:hidden")} style={rowsStyle} role="group" aria-label={`${name}, this week's doses`}>
          {rows.flatMap((r) => days.map((day) => {
            const d = cell(r, day);
            const id = `${r.key}|${day.toISOString()}`;
            if (!d) return <span key={id} className="pz-blister__cell pz-blister__cell--empty" aria-hidden="true" />;
            const future = isLaterDay(d.scheduled_at); // any of today's doses can be logged; later days unlock on the day
            const state = d.status === "TAKEN" ? "taken" : d.status === "MISSED" ? "missed" : d.status === "SKIPPED" ? "skipped" : future ? "upcoming" : "not taken yet";
            return (
              <button key={id} type="button" className={cn("pz-blister__cell", d.status === "MISSED" && "pz-blister__cell--missed", taking === d.id && "is-taking")}
                aria-pressed={d.status === "TAKEN"} aria-disabled={future || saving !== null || taking !== null || undefined}
                aria-label={`${weekdayLong(day)} ${r.time}, ${name}${amount ? `, ${amount.text}` : ""}, ${state}`}
                onClick={() => { if (!future && saving === null && taking === null) tap(d); }}>
                <DoseIcon route={route} /><Check className="pz-blister__tick" aria-hidden="true" strokeWidth={3} />
              </button>
            );
          }))}
        </div>
      </div>
      <p className="pz-blister__count !mt-0" role="status">{taken} of {doses.length} doses taken this week</p>
    </div>
  );
}

export function MedicationCalendar({ onDoseChange, refreshKey = 0, showScanLink = false }: { onDoseChange?: () => void; refreshKey?: number; showScanLink?: boolean }) {
  const [doses, setDoses] = useState<Dose[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [amounts, setAmounts] = useState<Record<string, DoseAmount | null>>({});
  const [routes, setRoutes] = useState<Record<string, Route>>({});
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => { setErr(null); schedule.week().then(setDoses).catch((e) => setErr(errorMessage(e))); }, [refreshKey, retry]);
  useEffect(() => {
    medications.list().then((ms) => {
      setAmounts(Object.fromEntries(ms.map((m) => [m.id, doseAmount(m.instructions)])));
      setRoutes(Object.fromEntries(ms.map((m) => [m.id, routeOf(m.name, m.instructions)])));
    }).catch(() => { setAmounts({}); setRoutes({}); });
  }, [refreshKey]);

  if (err) return <ErrorState message={err} onRetry={() => setRetry(retry + 1)} />;
  if (!doses) return <Loader label="Laying out your week…" />;
  if (!doses.length) return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-ink-muted">Nothing scheduled this week. Scan a prescription and your blister pack fills in by itself.</p>
      {showScanLink && <Link href="/medications" className="pz-btn pz-btn--secondary pz-btn--sm"><Upload aria-hidden="true" size={16} />Scan prescription</Link>}
    </div>
  );

  const seen: Partial<Record<Route, number>> = {};
  const meds = groupByMedicine(doses).map((m) => {
    const route = routes[m.id] ?? routeOf(m.name, null);
    const nth = seen[route] ?? 0; seen[route] = nth + 1;
    return { ...m, route, colour: colourFor(route, nth) };
  });
  const multi = meds.length > 1;

  async function toggle(d: Dose) {
    setSaving(d.id); setErr(null);
    try {
      const next = await schedule.setStatus(d.id, d.status === "TAKEN" ? "SCHEDULED" : "TAKEN");
      setDoses((all) => all && all.map((x) => (x.id === next.id ? next : x)));
      onDoseChange?.();
    } catch (e) { setErr(errorMessage(e, "That didn't save. Try again.")); }
    finally { setSaving(null); }
  }

  const go = (i: number) => {
    const el = track.current; if (!el) return;
    const n = Math.max(0, Math.min(meds.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => { const el = track.current; if (el) setActive(Math.round(el.scrollLeft / el.clientWidth)); };

  return (
    <div className="flex flex-col gap-3" aria-roledescription={multi ? "carousel" : undefined} aria-label={multi ? "Your medicines" : undefined}>
      <div ref={track} onScroll={onScroll} className="flex items-center snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {meds.map((m, i) => (
          <div key={m.id} className="w-full shrink-0 snap-center" aria-roledescription={multi ? "slide" : undefined} aria-label={multi ? `${i + 1} of ${meds.length}: ${m.name}` : undefined}>
            <Pack name={m.name} doses={m.doses} colour={m.colour} amount={amounts[m.id] ?? null} route={m.route} saving={saving} onToggle={toggle} />
          </div>
        ))}
      </div>
      {multi && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" className="pz-btn pz-btn--icon" style={{ width: 36, minHeight: 36 }} onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous medicine"><ChevronLeft aria-hidden="true" size={18} /></button>
          <div className="flex items-center gap-2">
            {meds.map((m, i) => (
              <button key={m.id} type="button" onClick={() => go(i)} aria-label={`Show ${m.name}`} aria-current={i === active || undefined}
                className={cn("h-2.5 rounded-pill transition-all", i === active ? "w-6" : "w-2.5 opacity-40")}
                style={{ background: m.colour.deep }} />
            ))}
          </div>
          <button type="button" className="pz-btn pz-btn--icon" style={{ width: 36, minHeight: 36 }} onClick={() => go(active + 1)} disabled={active === meds.length - 1} aria-label="Next medicine"><ChevronRight aria-hidden="true" size={18} /></button>
        </div>
      )}
      <p className="text-center text-caption text-ink-muted">Tap a dose when you&apos;ve taken it. Tap again to undo. You can log any of today&apos;s doses; later days unlock on the day. The week runs Monday to Sunday.{multi && " Swipe to see your other medicines."}</p>
    </div>
  );
}
