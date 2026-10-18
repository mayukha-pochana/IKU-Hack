// OWNER: Member 1 - field groups reused by the onboarding steps and the profile page.
"use client";
import { useId, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Chip, TextField } from "@/components/ui/pz";
import { recognise, searchConditions } from "@/lib/conditions";
import { COMMON_CONDITIONS, LANGUAGES, PREGNANT_OPTIONS, SEX_OPTIONS, SMOKING_OPTIONS, TRAVEL_OPTIONS, ageFromDob, type Draft } from "./profileDraft";

type P = { d: Draft; set: (d: Draft) => void; errors?: Partial<Record<keyof Draft, string | null>> };

/** Single-choice chips (radio group). Tapping the selected chip again clears it, since these questions are optional. */
function Choice<T extends string>({ label, help, value, options, onChange }: { label: string; help?: string; value: T | ""; options: { value: T; label: string }[]; onChange: (v: T | "") => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="pz-field__label">{label}</span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="pz-chip" onClick={() => onChange(value === o.value ? "" : o.value)}>
            <Check aria-hidden="true" strokeWidth={2.5} />{o.label}
          </button>
        ))}
      </div>
      {help && <span className="pz-field__help">{help}</span>}
    </div>
  );
}

export function AboutFields({ d, set, errors }: P) {
  const today = new Date().toISOString().slice(0, 10);
  const age = d.dob ? ageFromDob(d.dob) : null;
  return (
    <div className="flex flex-col gap-5">
      <TextField id="display_name" label="Your first name" autoComplete="given-name" required wide value={d.display_name}
        onChange={(e) => set({ ...d, display_name: e.target.value })} error={errors?.display_name} help="This is how we'll greet you." />
      <TextField id="dob" label="Date of birth" type="date" autoComplete="bday" max={today} min="1900-01-01" className="max-w-[240px]" value={d.dob}
        onChange={(e) => set({ ...d, dob: e.target.value })} error={errors?.dob}
        help={age != null && age >= 0 ? `You're ${age}. Trials set exact age limits, so this matters.` : d.age != null ? `We have your age as ${d.age}. Add your date of birth for more precise matching.` : "Trials set exact age limits, so this helps us check."} />
      <Choice label="Sex assigned at birth" value={d.sex} options={SEX_OPTIONS} onChange={(v) => set({ ...d, sex: v })}
        help="Some trials only recruit one sex, or have different rules for each." />
    </div>
  );
}

export function ConditionFields({ d, set }: P) {
  const listId = useId();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const suggestions = searchConditions(q).filter((c) => !d.conditions.includes(c));
  const open = q.trim().length > 0 && suggestions.length > 0;

  const toggle = (c: string) => set({ ...d, conditions: d.conditions.includes(c) ? d.conditions.filter((x) => x !== c) : [...d.conditions, c] });
  function add(name: string) {
    if (!d.conditions.includes(name)) set({ ...d, conditions: [...d.conditions, name] });
    setQ(""); setActive(0); setErr(null);
  }
  function submitTyped() {
    const exact = recognise(q);
    if (exact) return add(exact);
    if (open) return add(suggestions[active] ?? suggestions[0]);
    if (q.trim()) setErr(`We couldn't find “${q.trim()}”. Check the spelling, or pick a condition from the list.`);
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && open) { e.preventDefault(); setActive((active + 1) % suggestions.length); }
    else if (e.key === "ArrowUp" && open) { e.preventDefault(); setActive((active - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === "Enter") { e.preventDefault(); submitTyped(); }
    else if (e.key === "Escape") { setQ(""); }
  }

  const all = [...COMMON_CONDITIONS, ...d.conditions.filter((c) => !COMMON_CONDITIONS.includes(c))];
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="pz-field__label mb-2">Pick any that apply</legend>
        <div className="flex flex-wrap gap-2">{all.map((c) => <Chip key={c} pressed={d.conditions.includes(c)} onClick={() => toggle(c)}>{c}</Chip>)}</div>
      </fieldset>
      <div className={`pz-field pz-field--wide ${err ? "pz-field--error" : ""}`}>
        <label htmlFor="condition-search" className="pz-field__label">Search for another condition</label>
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <input id="condition-search" className="pz-field__input w-full" role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
              aria-activedescendant={open ? `${listId}-${active}` : undefined} aria-invalid={err ? true : undefined} aria-describedby="condition-help"
              value={q} placeholder="For example, psoriasis" autoComplete="off"
              onChange={(e) => { setQ(e.target.value); setActive(0); setErr(null); }} onKeyDown={onKey} />
            {open && (
              <ul id={listId} role="listbox" className="pz-listbox" aria-label="Matching conditions">
                {suggestions.map((s, i) => (
                  <li key={s} id={`${listId}-${i}`} role="option" aria-selected={i === active} className="pz-option"
                    onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); add(s); }}>
                    {s}<Plus aria-hidden="true" size={16} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" className="pz-btn pz-btn--secondary" onClick={submitTyped} disabled={!q.trim()}><Plus aria-hidden="true" size={20} />Add</button>
        </div>
        <span id="condition-help" className="pz-field__help">{err ?? "Choose from the list so we can match it to real trials. You can add more later."}</span>
      </div>
    </div>
  );
}

export function LocationFields({ d, set }: P) {
  return (
    <div className="flex flex-col gap-5">
      <TextField id="location" label="Town, city or postcode" autoComplete="address-level2" wide value={d.location}
        onChange={(e) => set({ ...d, location: e.target.value })} help="We show trials near you first. For example, London or SE1 9RT." />
      <Choice label="How far would you travel for trial visits?" value={d.travel as "" | "10" | "25" | "50" | "100" | "0"} options={TRAVEL_OPTIONS as { value: "10" | "25" | "50" | "100" | "0"; label: string }[]}
        onChange={(v) => set({ ...d, travel: v })} help="Most trials need regular visits to the hospital or clinic running them." />
      <div className="pz-field pz-field--wide">
        <label htmlFor="preferred_language" className="pz-field__label">Language for read aloud</label>
        <select id="preferred_language" className="pz-field__input" value={d.preferred_language} onChange={(e) => set({ ...d, preferred_language: e.target.value })}>
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <span className="pz-field__help">Screens stay in English. Spoken explanations use this language where available.</span>
      </div>
    </div>
  );
}

export function HealthFields({ d, set }: P) {
  return (
    <div className="flex flex-col gap-5">
      <Choice label="Do you smoke?" value={d.smoking} options={SMOKING_OPTIONS} onChange={(v) => set({ ...d, smoking: v })}
        help="Many trials, especially for lung conditions, don't include people who smoke." />
      {d.sex !== "male" && (
        <Choice label="Are you pregnant or breastfeeding?" value={d.pregnant} options={PREGNANT_OPTIONS} onChange={(v) => set({ ...d, pregnant: v })}
          help="Most medicine trials can't include people who are pregnant or breastfeeding." />
      )}
      <p className="text-caption text-ink-muted">These are optional. We only use them to flag requirements to discuss with the trial team.</p>
    </div>
  );
}
