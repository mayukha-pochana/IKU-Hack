// OWNER: Member 1 - accessibility features.
import { Contrast, Languages, MousePointerClick, Type, Volume2 } from "lucide-react";

const ITEMS = [
  { icon: Volume2, title: "Read aloud", body: "Hear your medication instructions and trial explanations in a natural voice, powered by ElevenLabs." },
  { icon: Type, title: "Easy-to-read text", body: "Set in Lexend, a typeface designed to reduce reading effort, at 16px or larger." },
  { icon: Languages, title: "Plain English", body: "Medical terms are explained in everyday words. Nothing is hidden behind jargon." },
  { icon: Contrast, title: "Clear contrast", body: "Text meets WCAG AA contrast, and status is always shown with an icon and a word." },
  { icon: MousePointerClick, title: "Big tap targets", body: "Every button is at least 44 pixels tall and works with a keyboard or screen reader." },
];

export function Accessibility() {
  return (
    <section id="accessibility" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-16 md:px-6 md:py-24">
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 className="text-h1">Built for everyone who reads a medicine label</h2>
        <p className="text-body-lg text-ink-muted">Clinical information is hard enough. The app shouldn&apos;t make it harder.</p>
      </div>
      <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((i) => (
          <li key={i.title} className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-mint-soft text-mint-text"><i.icon aria-hidden="true" size={20} /></span>
            <div className="flex flex-col gap-1"><h3 className="text-h3">{i.title}</h3><p className="text-ink-muted">{i.body}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
