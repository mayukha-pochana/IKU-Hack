// OWNER: Member 2 - last 7 days as the design system's PillBox (read-only). Data: GET /api/adherence/history.
import type { AdherenceDay } from "@/types";
import { Tablet } from "@/components/ui/pz";
import { cn } from "@/lib/utils";
import { mondayOf, weekdayLong, ymd } from "@/lib/format";

type State = "taken" | "missed" | "partial" | "today" | "rest" | "upcoming";

function stateOf(d: AdherenceDay, isToday: boolean): State {
  if (d.scheduled === 0) return isToday ? "today" : "rest"; // today's doses may just not be due yet
  if (d.missed > 0) return "missed";
  if (d.taken >= d.scheduled) return "taken";
  return isToday ? "today" : "partial";
}

const SAY: Record<State, (d: AdherenceDay) => string> = {
  taken: (d) => `all ${d.scheduled} taken`,
  missed: (d) => `${d.missed} missed, ${d.taken} of ${d.scheduled} taken`,
  partial: (d) => `${d.taken} of ${d.scheduled} taken`,
  today: (d) => (d.scheduled ? `today, ${d.taken} of ${d.scheduled} taken so far` : "today, nothing due yet"),
  rest: () => "no doses",
  upcoming: () => "later this week",
};

// Mini compartments matching the tray lids: green, red, plain closed, striped.
const LEGEND = [
  { label: "All taken", swatch: "bg-success-soft ring-2 ring-inset ring-success" },
  { label: "Missed", swatch: "bg-danger-soft ring-2 ring-inset ring-danger" },
  { label: "Some taken", swatch: "bg-violet-soft ring-1 ring-inset ring-line-strong" },
  { label: "No doses", swatch: "bg-[repeating-linear-gradient(135deg,var(--violet-soft)_0_2px,var(--surface-raised)_2px_4px)] ring-1 ring-inset ring-line" },
];

/** Streak flame: orange flame, yellow core, a spark and a soft glow underneath. */
export function StreakFlame({ size = 28 }: { size?: number }) {
  return (
    <svg className="pz-flame" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="16" cy="28.4" rx="8" ry="2" fill="#fde9a8" />
      <circle className="pz-flame__spark" cx="8.6" cy="6.4" r="1.3" fill="#f6c27a" />
      <path className="pz-flame__outer" d="M16 27.2c-5.4 0-9.2-3.8-9.2-8.6 0-4.6 3.4-8.2 6.4-11.6.4 2.6 1.6 4.2 3 4.8.8-2.6 2.6-5 5.4-6.6-.6 3.2.4 5.4 1.8 7.6 1.2 1.9 2 3.8 2 5.8 0 4.8-3.8 8.6-9.4 8.6z" fill="#f39a2d" />
      <path className="pz-flame__inner" d="M16 25.2c-2.4 0-4.2-1.7-4.2-3.9 0-2.4 2.3-4.6 4.2-6.8 1.9 2.2 4.2 4.4 4.2 6.8 0 2.2-1.8 3.9-4.2 3.9z" fill="#f7cf45" />
    </svg>
  );
}

/** Days in a row (newest first) with every dose marked taken. No-dose days are skipped;
 *  today only counts once complete, and an unfinished today doesn't break the streak. */
export function streak(days: AdherenceDay[], today = new Date()) {
  let n = 0;
  for (const d of [...days].sort((a, b) => b.day.localeCompare(a.day))) {
    const isToday = new Date(`${d.day}T12:00:00`).toDateString() === today.toDateString();
    if (d.scheduled === 0) continue;
    if (d.missed === 0 && d.taken >= d.scheduled) { n++; continue; }
    if (isToday && d.missed === 0) continue;
    break;
  }
  return n;
}

export function AdherenceWeek({ days }: { days: AdherenceDay[] }) {
  // Monday to Sunday of this week, matching the blister pack. Days after today haven't happened yet.
  const now = new Date();
  const byDay = new Map(days.map((d) => [d.day, d]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = mondayOf(now); date.setDate(date.getDate() + i);
    const key = ymd(date);
    const d = byDay.get(key) ?? { day: key, scheduled: 0, taken: 0, missed: 0 };
    const isToday = date.toDateString() === now.toDateString();
    const state: State = date > now && !isToday ? "upcoming" : stateOf(d, isToday);
    return { d, date, state };
  });
  const missed = week.filter((w) => w.state === "missed");
  const run = streak(days);

  return (
    <div className="flex flex-col gap-3">
      {run > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill bg-[#fff1df] py-1 pl-1.5 pr-3 font-semibold text-[#9a4b06]"><StreakFlame size={24} />{run}-day streak</span>
          <span className="text-label font-normal text-ink-muted">every dose marked taken</span>
        </p>
      ) : (
        <p className="text-label font-normal text-ink-muted">No streak yet. Mark every dose today to start one.</p>
      )}
      <ol className="pz-pillbox__tray !w-full" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} aria-label="This week, Monday to Sunday">
        {week.map(({ d, date, state }) => {
          const letter = weekdayLong(date).charAt(0);
          return (
            <li key={d.day} aria-label={`${weekdayLong(date)}: ${SAY[state](d)}`}
              className={cn("pz-pillbox__day !h-16 !cursor-default", state === "missed" && "pz-pillbox__day--missed", state === "taken" && "pz-pillbox__day--taken", state === "today" && "pz-pillbox__day--today", state === "rest" && "pz-pillbox__day--rest", state === "upcoming" && "opacity-50")}>
              <span className="pz-pillbox__ghost !text-2xl" aria-hidden="true">{letter}</span>
              {state !== "rest" && <span className="pz-pillbox__well" aria-hidden="true"><Tablet /></span>}
              {state !== "rest" && <span className="pz-pillbox__lid !text-lg" aria-hidden="true">{letter}</span>}
            </li>
          );
        })}
      </ol>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-caption text-ink-muted sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-2" aria-hidden="true">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1 whitespace-nowrap"><span className={cn("h-[14px] w-[11px] shrink-0 rounded-[3px]", l.swatch)} />{l.label}</li>
        ))}
      </ul>
      {missed.length > 0 && (
        <p className="pz-card__body">
          Missed: {missed.map((w) => `${weekdayLong(w.date)} (${w.d.missed} ${w.d.missed === 1 ? "dose" : "doses"})`).join(", ")}.
        </p>
      )}
    </div>
  );
}
