// OWNER: Member 2 - nav + page shell for all signed-in pages. Redirects to /login without a backend session.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FlaskConical, LayoutDashboard, LogOut, NotebookPen, Pill, Search, UserRound } from "lucide-react";
import { ApiError, auth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { Loader, Notice, errorMessage } from "@/components/ui/pz";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

// `short` is the label in the phone tab bar, where five items share the width.
const NAV = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/medications", label: "My medications", short: "Medicines", icon: Pill },
  { href: "/trials", label: "Clinical trials", short: "Trials", icon: Search },
  { href: "/check-in", label: "Daily diary", short: "Diary", icon: NotebookPen },
  { href: "/profile", label: "My profile", short: "Profile", icon: UserRound },
];

type Session = { email: string; demo_mode: boolean };

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    auth.session().then(setSession).catch((e) => {
      if (e instanceof ApiError && e.status === 401) router.replace("/login");
      else setErr(errorMessage(e));
    });
  }, [router]);

  async function signOut() { await auth.logout().catch(() => {}); router.push("/"); }
  const active = (href: string) => path === href || (href !== "/dashboard" && path.startsWith(href));

  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:inset-x-0 focus:top-0 focus:z-50 focus:block focus:bg-violet focus:px-4 focus:py-3 focus:text-violet-on focus:font-semibold">Skip to content</a>
      {/* Phone: slim top bar. Desktop: sidebar. */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface-raised px-4 py-2 md:hidden">
        <Logo href="/dashboard" width={124} />
        <button type="button" onClick={signOut} className="pz-btn pz-btn--icon" aria-label="Sign out"><LogOut aria-hidden="true" size={20} /></button>
      </header>
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-line md:bg-surface-raised">
        <div className="px-5 py-6"><Logo href="/dashboard" width={136} /></div>
        <nav aria-label="Main" className="flex-1 px-3">
          <ul className="flex flex-col gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={active(n.href) ? "page" : undefined}
                  className={cn("flex min-h-tap items-center gap-3 whitespace-nowrap rounded-md px-3 font-medium",
                    active(n.href) ? "bg-violet text-violet-on" : "text-ink hover:bg-violet-soft")}>
                  <n.icon aria-hidden="true" size={20} />{n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-3 border-t border-line p-4">
          {session?.demo_mode && <span className="pz-badge pz-badge--neutral self-start"><FlaskConical aria-hidden="true" />Demo mode</span>}
          {session && <p className="truncate text-caption text-ink-muted" title={session.email}>{session.email}</p>}
          <button type="button" onClick={signOut} className="pz-btn pz-btn--ghost pz-btn--sm justify-start"><LogOut aria-hidden="true" size={18} />Sign out</button>
        </div>
      </aside>
      {/* Phone: app-style tab bar fixed to the bottom, clear of the home indicator. */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {NAV.map((n) => {
            const on = active(n.href);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={on ? "page" : undefined}
                  className={cn("flex min-h-[60px] flex-col items-center justify-center gap-1 text-caption font-medium", on ? "text-violet-text" : "text-ink-muted")}>
                  <span className={cn("flex h-8 w-14 items-center justify-center rounded-pill transition-colors", on && "bg-violet-soft")}>
                    <n.icon aria-hidden="true" size={22} strokeWidth={on ? 2.4 : 2} />
                  </span>
                  {n.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0 flex-1">
      <PreviewBanner />
      <main id="main" className="min-w-0 px-4 pb-28 pt-6 md:px-10 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          {session?.demo_mode && <span className="pz-badge pz-badge--neutral self-start md:hidden"><FlaskConical aria-hidden="true" />Demo mode · sample data</span>}
          {err ? <Notice tone="danger">{err}</Notice> : session ? children : <Loader label="Checking you're signed in…" />}
          <p className="text-caption text-ink-muted">Prototype with synthetic data. Not medical advice. Trial matches are preliminary; the trial team decides who can take part. In an emergency, call 999.</p>
        </div>
      </main>
      </div>
    </div>
  );
}
