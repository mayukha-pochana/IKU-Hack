// How a medicine is taken, grouped into the team's four administration categories.
// The backend has no route field yet, so this is inferred for display only from the
// patient-confirmed name and instructions. Anything unclear falls back to "enteral".
export type Route = "enteral" | "parenteral" | "topical" | "pulmonary";

export const ROUTE_LABEL: Record<Route, string> = {
  enteral: "Swallowed",
  parenteral: "Injection",
  topical: "On the skin, eyes, ears or nose",
  pulmonary: "Inhaled",
};

const RULES: [Route, RegExp][] = [
  ["pulmonary", /\b(puffs?|inhal\w*|nebuli[sz]\w*|vapori[sz]\w*|turbohaler|evohaler|accuhaler|easyhaler)\b/i],
  ["parenteral", /\b(inject\w*|injection|syringe|pen|infusion|intravenous|iv|intramuscular|im|subcutaneous\w*|subq|epidural|intrathecal|units?)\b/i],
  ["topical", /\b(apply|cream|ointment|gel|lotion|patch(es)?|transdermal|drops?|eye|ear|nasal|nose|nostril|spray)\b/i],
];

export function routeOf(name: string | null | undefined, instructions: string | null | undefined): Route {
  const text = `${name ?? ""} ${instructions ?? ""}`;
  for (const [route, re] of RULES) if (re.test(text)) return route;
  return "enteral";
}
