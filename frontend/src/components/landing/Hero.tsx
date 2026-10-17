// OWNER: Member 1 - implement from Figma. TODO: product demo preview image/video.
import Link from "next/link";
export function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h1 className="text-4xl font-extrabold md:text-6xl">Clinical Trials, Without the Complexity.</h1>
      <p className="mt-4 text-lg text-slate-700">Discover relevant clinical trials, manage your medication, and stay on top of your health in one intelligent companion.</p>
      <Link href="/login" className="mt-8 inline-block rounded bg-brand-600 px-6 py-3 text-lg text-white">Get Started</Link>
    </section>
  );
}
