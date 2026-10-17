// OWNER: Member 1 - only list features that are actually implemented (update status honestly).
const FEATURES = [
  "One reusable health profile",
  "Plain-language trial explanations",
  "Medication reminders and self-reported adherence",
  "Optional contactless check-in (where supported)",
  "Voice explanations for accessibility",
];
export function Features() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="text-2xl font-bold">Built to reduce friction</h2>
      <ul className="mt-4 list-disc pl-6">{FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
    </section>
  );
}
