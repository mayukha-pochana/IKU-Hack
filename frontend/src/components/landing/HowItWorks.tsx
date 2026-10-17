// OWNER: Member 1
const STEPS = [
  { t: "Scan", d: "Photograph a prescription; we pull out the details for you to confirm." },
  { t: "Discover", d: "See recruiting trials that may be relevant, explained in plain language." },
  { t: "Stay on track", d: "Get a medication schedule and optional daily check-ins." },
];
export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="text-2xl font-bold">How it works</h2>
      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (<li key={s.t} className="rounded-lg border p-4"><p className="font-semibold">{i + 1}. {s.t}</p><p>{s.d}</p></li>))}
      </ol>
    </section>
  );
}
