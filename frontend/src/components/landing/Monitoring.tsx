// OWNER: Member 1 - contactless health-monitoring feature (Presage). Describe it honestly: optional, no video stored, not diagnostic.
import { Camera, EyeOff, HeartPulse, Wind } from "lucide-react";

export function Monitoring() {
  return (
    <section id="check-in" className="scroll-mt-20 bg-violet text-violet-on">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
        <div className="flex flex-col gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-white/15"><Camera aria-hidden="true" size={22} /></span>
          <h2 className="text-h1">A daily check-in, using just your camera</h2>
          <p className="text-body-lg opacity-90">
            Sit still in good light while Presage measures your heart rate and breathing rate without anything touching you,
            and you can add a note about how you feel.
          </p>
          <ul className="flex flex-col gap-2 opacity-90">
            <li className="flex gap-2"><EyeOff aria-hidden="true" size={20} className="mt-0.5 shrink-0" />No video is saved. Only the readings you choose to keep.</li>
            <li className="flex gap-2"><Camera aria-hidden="true" size={20} className="mt-0.5 shrink-0" />Optional. You can skip it and still log doses.</li>
          </ul>
          <p className="text-label opacity-80">These readings are for your records. They don&apos;t diagnose anything.</p>
        </div>
        <div className="grid grid-cols-2 gap-4" aria-label="Example readings">
          {[{ icon: HeartPulse, n: "72", u: "heart rate, bpm" }, { icon: Wind, n: "15", u: "breaths per minute" }].map((r) => (
            <div key={r.u} className="flex flex-col gap-2 rounded-lg bg-surface-raised p-6 text-ink">
              <r.icon aria-hidden="true" size={22} className="text-violet-text" />
              <span className="text-[40px] font-semibold leading-none">{r.n}</span>
              <span className="text-label text-ink-muted">{r.u}</span>
            </div>
          ))}
          <p className="col-span-2 text-caption opacity-80">Example readings. Measured with Presage on supported devices.</p>
        </div>
      </div>
    </section>
  );
}
