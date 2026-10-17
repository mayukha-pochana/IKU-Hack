// OWNER: Member 1
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CallToAction() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
      <div className="flex flex-col items-start gap-6 rounded-lg bg-violet-soft p-8 md:flex-row md:items-center md:justify-between md:p-12">
        <div className="flex max-w-xl flex-col gap-2">
          <h2 className="text-h1">Less admin. More taking part.</h2>
          <p className="text-body-lg text-ink-muted">Set up your profile in three short steps. You can change anything later.</p>
        </div>
        <Link href="/login" className="pz-btn pz-btn--primary pz-btn--lg shrink-0">Get started <ArrowRight aria-hidden="true" size={20} /></Link>
      </div>
    </section>
  );
}
