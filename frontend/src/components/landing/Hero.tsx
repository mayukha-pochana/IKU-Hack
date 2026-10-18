// OWNER: Member 1
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductPreview } from "./ProductPreview";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pb-16 pt-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:px-6 md:pb-24 md:pt-20">
      <div className="flex min-w-0 flex-col items-start gap-6">
        <p className="pz-badge pz-badge--neutral">For patients in the UK</p>
        <h1 className="text-[36px] font-semibold leading-[42px] tracking-[-0.02em] md:text-display">Clinical trials, without the complexity.</h1>
        <p className="max-w-[34rem] text-body-lg text-ink-muted">
          Discover relevant clinical trials, manage your medication, and stay on top of your health in one intelligent companion.
          Fill in your details once and every trial is checked for you.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="pz-btn pz-btn--primary pz-btn--lg">Get started <ArrowRight aria-hidden="true" size={20} /></Link>
          <a href="#how" className="pz-btn pz-btn--secondary pz-btn--lg">See how it works</a>
        </div>
      </div>
      <ProductPreview />
    </section>
  );
}
