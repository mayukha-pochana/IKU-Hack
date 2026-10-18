// OWNER: Member 1
"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#check-in", label: "Health check-in" },
  { href: "#accessibility", label: "Accessibility" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => <a key={l.href} href={l.href} className="pz-btn pz-btn--ghost">{l.label}</a>)}
          <Link href="/login" className="pz-btn pz-btn--primary">Sign in</Link>
        </nav>
        <button type="button" className="pz-btn pz-btn--icon md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
          {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Primary" className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden">
          {LINKS.map((l) => <a key={l.href} href={l.href} className="pz-btn pz-btn--ghost justify-start" onClick={() => setOpen(false)}>{l.label}</a>)}
          <Link href="/login" className="pz-btn pz-btn--primary mt-2">Sign in</Link>
        </nav>
      )}
    </header>
  );
}
