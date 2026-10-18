// OWNER: Member 2 - diary history from GET /api/health-checkins.
// One continuous, swipeable strip of days back to the first entry; tapping a day shows its entries underneath.
"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, HeartPulse, Wind } from "lucide-react";
import { checkins } from "@/lib/api";
import type { Checkin } from "@/types";
import { mondayOf, time24, weekdayLong, ymd } from "@/lib/format";
import { fromReport, type Mood } from "@/lib/diary";
import { Loader } from "@/components/ui/pz";
import { cn } from "@/lib/utils";
import { MOOD_STYLE, MoodFace } from "@/components/biometrics/MoodIcon";

const CARD_TONES = ["pz-soft-card--sky", "pz-soft-card--mint", "pz-soft-card--pink"];
const MIN_DAYS_BACK = 41; // always offer about six weeks to swipe through
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const longDate = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

/** Entries grouped by local day (YYYY-MM-DD), newest first within a day. */
export function groupByDay(rows: Checkin[]) {
  const map = new Map<string, Checkin[]>();
  for (const c of [...rows].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))) {
    const k = ymd(new Date(c.recorded_at));
    map.set(k, [...(map.get(k) ?? []), c]);
  }
  return map;
}
const moodOf = (list: Checkin[] | undefined): Mood | null => list?.map((c) => fromReport(c.symptom_report).mood).find(Boolean) ?? null;

function DayChip({ day, mood, selected, today, onSelect }: { day: Date; mood: Mood | null; selected: boolean; today: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} data-day={ymd(day)} aria-pressed={selected}
      aria-label={`${longDate(day)}: ${mood ? `feeling ${mood.toLowerCase()}` : "no entry"}`}
      className={cn("flex w-12 shrink-0 snap-center flex-col items-center gap-1.5 rounded-[18px] py-2 transition-colors duration-200",
        selected ? "bg-violet-soft" : "hover:bg-violet-soft/60")}>
      <span className={cn("text-caption", today ? "font-semibold text-violet-text" : "text-ink-muted")}>{weekdayLong(day).charAt(0)}</span>
      {mood ? <MoodFace mood={mood} size={36} className={cn(selected && "drop-shadow-[0_4px_8px_rgba(59,47,143,0.25)]")} /> : (
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-pill text-label",
          today ? "bg-violet text-violet-on" : "bg-surface-raised text-ink-muted shadow-[inset_0_0_0_1.5px_var(--line)]")}>{day.getDate()}</span>
      )}
      <span className={cn("text-caption", selected ? "font-semibold text-ink" : "text-ink-muted")}>{mood ? day.getDate() : " "}</span>
    </button>
  );
}

function WeekStrip({ byDay, selected, onSelect }: { byDay: Map<string, Checkin[]>; selected: Date; onSelect: (d: Date) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const today = new Date();
  const days = useMemo(() => {
    const keys = [...byDay.keys()].sort();
    const earliest = keys.length ? new Date(`${keys[0]}T12:00:00`) : today;
    const start = mondayOf(new Date(Math.min(earliest.getTime(), addDays(today, -MIN_DAYS_BACK).getTime())));
    const end = addDays(mondayOf(today), 6);
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [byDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the selected day in view (centred) whenever it changes, without animating the first jump.
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = track.current?.querySelector<HTMLElement>(`[data-day="${ymd(selected)}"]`);
    if (!el || !track.current) return;
    const t = track.current;
    t.scrollTo({ left: el.offsetLeft - t.clientWidth / 2 + el.clientWidth / 2, behavior: first.current ? "auto" : "smooth" });
    first.current = false;
  }, [selected]);

  const scrollBy = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => scrollBy(-1)} className="pz-btn pz-btn--icon !h-9 !min-h-9 !w-9 shrink-0 max-sm:!hidden" aria-label="Earlier days"><ChevronLeft aria-hidden="true" size={18} /></button>
      <div ref={track} className="pz-edge-fade flex min-w-0 flex-1 snap-x snap-mandatory gap-1 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((d, i) => {
          const isMonday = d.getDay() === 1;
          const monthStart = i === 0 || d.getDate() === 1;
          return (
            <div key={ymd(d)} className={cn("flex flex-col items-center", isMonday && "ml-2 border-l border-line pl-2 first:ml-0 first:border-0 first:pl-0")}>
              <span aria-hidden="true" className="h-5 self-start whitespace-nowrap pl-1 text-caption font-semibold text-violet-text">{monthStart ? d.toLocaleDateString("en-GB", { month: "short" }) : ""}</span>
              <DayChip day={d} mood={moodOf(byDay.get(ymd(d)))} selected={ymd(d) === ymd(selected)} today={ymd(d) === ymd(today)} onSelect={() => onSelect(d)} />
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => scrollBy(1)} className="pz-btn pz-btn--icon !h-9 !min-h-9 !w-9 shrink-0 max-sm:!hidden" aria-label="Later days"><ChevronRight aria-hidden="true" size={18} /></button>
    </div>
  );
}

function DayEntries({ day, list }: { day: Date; list: Checkin[] | undefined }) {
  const isToday = ymd(day) === ymd(new Date());
  return (
    <div key={ymd(day)} className="pz-page-in flex flex-col gap-3" aria-live="polite">
      <h3 className="text-h3">{isToday ? "Today" : longDate(day)}</h3>
      {!list?.length ? (
        <p className="rounded-[20px] border border-dashed border-line px-4 py-5 text-center text-ink-muted">
          {isToday ? "No entry yet today. Add one above whenever you like." : "No entry on this day."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((c, i) => {
            const { mood, note } = fromReport(c.symptom_report);
            return (
              <li key={c.id} className={cn("pz-soft-card flex items-start gap-4", CARD_TONES[i % CARD_TONES.length])}>
                {mood ? <MoodFace mood={mood} size={48} /> : <span aria-hidden="true" className="h-12 w-12 shrink-0 rounded-pill bg-white/80" />}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <time dateTime={c.recorded_at} className="text-caption text-ink-muted">{time24(c.recorded_at)}</time>
                  <span className="font-semibold" style={mood ? { color: MOOD_STYLE[mood].deep } : undefined}>{mood ? `Feeling ${mood.toLowerCase()}` : "Diary entry"}</span>
                  {(c.heart_rate != null || c.breathing_rate != null) && (
                    <div className="flex flex-wrap gap-4 text-label font-normal">
                      {c.heart_rate != null && <span className="flex items-center gap-1.5"><HeartPulse aria-hidden="true" size={16} className="text-violet-text" />{Math.round(c.heart_rate)} bpm</span>}
                      {c.breathing_rate != null && <span className="flex items-center gap-1.5"><Wind aria-hidden="true" size={16} className="text-violet-text" />{Math.round(c.breathing_rate)} breaths/min</span>}
                      {c.measurement_source === "presage_sdk" && <span className="text-caption text-ink-muted">Measured with Presage</span>}
                    </div>
                  )}
                  {note && <p className="text-ink">{note}</p>}
                  {!mood && !note && c.heart_rate == null && c.breathing_rate == null && <p className="text-ink-muted">Checked in, no details added.</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function HealthHistory({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<Checkin[] | null>(null);
  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; });
  useEffect(() => { checkins.list().then(setRows).catch(() => setRows([])); }, [refreshKey]);
  const byDay = useMemo(() => groupByDay(rows ?? []), [rows]);
  if (!rows) return <Loader label="Loading your diary…" />;
  const pick = (d: Date) => { const x = new Date(d); x.setHours(12, 0, 0, 0); setSelected(x); };

  return (
    <section aria-labelledby="hist-h" className="flex flex-col gap-5 rounded-[28px] border border-line bg-surface-raised p-4 shadow-[0_10px_30px_rgba(59,47,143,0.06)] sm:p-6">
      <div>
        <h2 id="hist-h" className="text-h2">Your history</h2>
        <p className="text-label font-normal text-ink-muted">Swipe to look back through your days. Tap one to see what you wrote.</p>
      </div>
      <WeekStrip byDay={byDay} selected={selected} onSelect={pick} />
      <div className="border-t border-line pt-5"><DayEntries day={selected} list={byDay.get(ymd(selected))} /></div>
    </section>
  );
}
