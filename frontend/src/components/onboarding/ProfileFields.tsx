// OWNER: Member 1 - field groups reused by the onboarding steps and the profile page.
"use client";
import { useId, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Chip, TextField } from "@/components/ui/pz";
import { recognise, searchConditions } from "@/lib/conditions";
import { COMMON_CONDITIONS, PREGNANT_OPTIONS, SEX_OPTIONS, SMOKING_OPTIONS, ageFromDob, type Draft } from "./profileDraft";

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
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="display_name" label="First name" autoComplete="given-name" required value={d.display_name}
          onChange={(e) => set({ ...d, display_name: e.target.value })} error={errors?.display_name} help="This is how we'll greet you." />
        <TextField id="last_name" label="Last name" autoComplete="family-name" value={d.last_name}
          onChange={(e) => set({ ...d, last_name: e.target.value })} help="Optional." />
      </div>
      <TextField id="dob" label="Date of birth" type="date" autoComplete="bday" max={today} min="1900-01-01" className="max-w-[240px]" value={d.dob}
        onChange={(e) => set({ ...d, dob: e.target.value })} error={errors?.dob}
        help={age != null && age >= 0 ? `You're ${age}. Trials set exact age limits, so this matters.` : d.age != null ? `We have your age as ${d.age}. Add your date of birth for more precise matching.` : "Trials set exact age limits, so this helps us check."} />
      <Choice label="Sex assigned at birth" value={d.sex} options={SEX_OPTIONS} onChange={(v) => set({ ...d, sex: v })}
        help="Some trials only recruit one sex, or have different rules for each." />
    </div>
  );
}

export function ContactFields({ d, set, errors, email }: P & { email: string | null }) {
  return (
    <div className="flex flex-col gap-5">
      {email && <TextField id="account_email" label="Email" wide readOnly value={email} help="You sign in with this. To use a different email, sign out and sign in with it." />}
      <TextField id="phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" wide value={d.phone}
        onChange={(e) => set({ ...d, phone: e.target.value })} error={errors?.phone} help="Optional. Handy to have ready if you contact a trial team." />
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

// Drag to set distance: 5 to 160 km in steps of 5, with "Any distance" past the end (stored as 0).
const ANY = 165;
function TravelSlider({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  const n = value === "" ? 40 : Number(value) === 0 ? ANY : Number(value);
  const label = n === ANY ? "Any distance" : `${n} km`;
  const pct = ((n - 5) / (ANY - 5)) * 100;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="pz-field__label">How far would you travel for trial visits?</label>
      <p className="text-h2 tabular-nums text-violet-text" aria-hidden="true">{value === "" ? "Not set" : label}</p>
      <input id={id} type="range" min={5} max={ANY} step={5} value={n} className="pz-range" style={{ "--pz-fill": `${pct}%` } as React.CSSProperties}
        aria-valuetext={n === ANY ? "Any distance" : `Up to ${n} kilometres`} onChange={(e) => onChange(Number(e.target.value) === ANY ? "0" : e.target.value)} />
      <div className="flex justify-between text-caption text-ink-muted" aria-hidden="true"><span>5 km</span><span>Any distance</span></div>
      <span className="pz-field__help">Drag to set how far. Most trials need regular visits to the hospital or clinic running them.</span>
    </div>
  );
}

export function LocationFields({ d, set }: P) {
  return (
    <div className="flex flex-col gap-5">
      <TextField id="location" label="Town, city or postcode" autoComplete="address-level2" wide value={d.location}
        onChange={(e) => set({ ...d, location: e.target.value })} help="We show trials near you first. For example, London or SE1 9RT." />
      <TravelSlider value={d.travel} onChange={(v) => set({ ...d, travel: v })} />
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
