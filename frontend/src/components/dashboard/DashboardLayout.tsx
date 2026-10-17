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

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/medications", label: "My medications", icon: Pill },
  { href: "/trials", label: "Clinical trials", icon: Search },
  { href: "/check-in", label: "Daily diary", icon: NotebookPen },
  { href: "/profile", label: "My profile", icon: UserRound },
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
      <aside className="border-b border-line bg-surface-raised md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-6">
          <Logo href="/dashboard" width={136} />
          <button type="button" onClick={signOut} className="pz-btn pz-btn--ghost pz-btn--sm md:hidden">Sign out</button>
        </div>
        <nav aria-label="Main" className="overflow-x-auto px-2 pb-2 md:flex-1 md:px-3">
          <ul className="flex gap-1 md:flex-col">
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
        <div className="hidden flex-col gap-3 border-t border-line p-4 md:flex">
          {session?.demo_mode && <span className="pz-badge pz-badge--neutral self-start"><FlaskConical aria-hidden="true" />Demo mode</span>}
          {session && <p className="truncate text-caption text-ink-muted" title={session.email}>{session.email}</p>}
          <button type="button" onClick={signOut} className="pz-btn pz-btn--ghost pz-btn--sm justify-start"><LogOut aria-hidden="true" size={18} />Sign out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
      <PreviewBanner />
      <main id="main" className="min-w-0 px-4 py-6 md:px-10 md:py-10">
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
