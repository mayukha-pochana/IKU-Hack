// OWNER: Member 1
import Link from "next/link";
export function Navbar() {
  return (
    <header className="flex items-center justify-between border-b p-4">
      <span className="text-xl font-bold text-brand-700">CareFlow AI</span>
      <nav aria-label="Primary" className="flex items-center gap-4">
        <a href="#how">How it works</a>
        <a href="#features">Features</a>
        <Link href="/login" className="rounded bg-brand-600 px-4 py-2 text-white">Get Started</Link>
      </nav>
    </header>
  );
}
