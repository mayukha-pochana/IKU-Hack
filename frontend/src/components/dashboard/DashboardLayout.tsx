// OWNER: Member 2 - nav + page shell for all signed-in pages. Redirects to /login without a backend session.
// Desktop: frosted sidebar that collapses to an icon rail with the menu button (remembered per browser).
// Phone: big centred logo at the top and a floating tab bar with a sliding active pill.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FlaskConical, LayoutDashboard, LogOut, Menu, NotebookPen, Pill, Search, UserRound } from "lucide-react";
import { ApiError, auth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo, LogoIcon } from "@/components/brand/Logo";
import { Loader, Notice, errorMessage } from "@/components/ui/pz";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

// `short` is the label in the phone tab bar, where five items share the width.
const NAV = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/medications", label: "My medications", short: "Meds", icon: Pill },
  { href: "/trials", label: "Clinical trials", short: "Trials", icon: Search },
  { href: "/check-in", label: "Daily diary", short: "Diary", icon: NotebookPen },
  { href: "/profile", label: "My profile", short: "Profile", icon: UserRound },
];

const SIDEBAR_KEY = "pz:sidebar-collapsed";
type Session = { email: string; demo_mode: boolean };

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false); // animate only user toggles, not the saved state applied on load

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1"); } catch { /* storage off */ }
    const id = requestAnimationFrame(() => setReady(true));
    auth.session().then(setSession).catch((e) => {
      if (e instanceof ApiError && e.status === 401) router.replace("/login");
      else setErr(errorMessage(e));
    });
    return () => cancelAnimationFrame(id);
  }, [router]);

  function toggle() {
    setCollapsed((c) => { try { localStorage.setItem(SIDEBAR_KEY, c ? "0" : "1"); } catch { /* storage off */ } return !c; });
  }
  async function signOut() { await auth.logout().catch(() => {}); router.push("/"); }
  const active = (href: string) => path === href || (href !== "/dashboard" && path.startsWith(href));
  const activeIndex = Math.max(0, NAV.findIndex((n) => active(n.href)));

  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:inset-x-0 focus:top-0 focus:z-50 focus:block focus:bg-violet focus:px-4 focus:py-3 focus:text-violet-on focus:font-semibold">Skip to content</a>

      {/* Phone: a big centred logo that scrolls away with the page (the tab bar stays). */}
      <header className="flex items-center justify-center px-4 pb-2 pt-[calc(env(safe-area-inset-top)+16px)] md:hidden">
        <Logo href="/dashboard" width={176} />
      </header>

      {/* Desktop: collapsible frosted sidebar. */}
      <aside data-collapsed={collapsed} data-ready={ready} className={cn("pz-sidebar pz-glass hidden border-r border-line md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col", collapsed ? "md:w-[84px]" : "md:w-64")}>
        <div className={cn("flex items-center gap-2 py-5", collapsed ? "flex-col px-3" : "justify-between px-4")}>
          {collapsed ? <Link href="/dashboard" aria-label="PhaseZero home" className="flex h-11 w-11 items-center justify-center"><LogoIcon size={30} /></Link> : <Logo href="/dashboard" width={136} />}
          <button type="button" onClick={toggle} className="pz-btn pz-btn--icon" aria-label={collapsed ? "Expand menu" : "Collapse menu"} aria-expanded={!collapsed}>
            <Menu aria-hidden="true" size={20} />
          </button>
        </div>
        <nav aria-label="Main" className="flex-1 px-3">
          <ul className="flex flex-col gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={active(n.href) ? "page" : undefined} title={collapsed ? n.label : undefined}
                  className={cn("relative flex min-h-tap items-center gap-3 rounded-md px-3 font-medium transition-colors duration-200",
                    collapsed && "justify-center px-0",
                    active(n.href) ? "bg-violet text-violet-on shadow-[0_6px_16px_rgba(59,47,143,0.28)]" : "text-ink hover:bg-violet-soft")}>
                  <n.icon aria-hidden="true" size={20} className="shrink-0" />
                  <span className="pz-sidebar__label">{n.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={cn("flex flex-col gap-3 border-t border-line p-4", collapsed && "items-center px-3")}>
          {!collapsed && session?.demo_mode && <span className="pz-badge pz-badge--neutral self-start"><FlaskConical aria-hidden="true" />Demo mode</span>}
          {!collapsed && session && <p className="truncate text-caption text-ink-muted" title={session.email}>{session.email}</p>}
          <button type="button" onClick={signOut} title={collapsed ? "Sign out" : undefined} aria-label={collapsed ? "Sign out" : undefined}
            className={cn("pz-btn pz-btn--ghost pz-btn--sm", collapsed ? "!px-0" : "justify-start")}>
            <LogOut aria-hidden="true" size={18} />{!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {/* Phone: floating tab bar, clear of the home indicator, with a pill that slides to the active tab.
          Sign out sits at the end as a narrower icon-only slot. */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-30 mb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="pz-glass relative rounded-[28px] border border-line p-1.5 shadow-[0_12px_32px_rgba(28,26,51,0.16)]">
          <span aria-hidden="true" className="pz-tabbar__pill absolute inset-y-1.5 left-1.5 w-[calc((100%-12px-48px)/5)] rounded-[22px] bg-violet shadow-[0_6px_16px_rgba(59,47,143,0.35)]"
            style={{ transform: `translateX(${activeIndex * 100}%)` }} />
          <ul className="relative grid grid-cols-[repeat(5,minmax(0,1fr))_48px]">
            {NAV.map((n) => {
              const on = active(n.href);
              return (
                <li key={n.href}>
                  <Link href={n.href} aria-current={on ? "page" : undefined}
                    className={cn("flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-[22px] text-[11.5px] font-medium tracking-[-0.01em] transition-colors duration-300", on ? "text-violet-on" : "text-ink-muted")}>
                    <n.icon aria-hidden="true" size={22} strokeWidth={on ? 2.4 : 2} />
                    {n.short}
                  </Link>
                </li>
              );
            })}
            <li className="flex items-center border-l border-line">
              <button type="button" onClick={signOut} aria-label="Sign out"
                className="flex min-h-[56px] w-full items-center justify-center rounded-[22px] text-ink-muted transition-colors hover:text-ink">
                <LogOut aria-hidden="true" size={20} />
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <PreviewBanner />
        <main id="main" className="min-w-0 px-4 pb-32 pt-6 md:px-10 md:py-10">
          <div key={path} className="pz-page-in mx-auto flex max-w-5xl flex-col gap-8">
            {session?.demo_mode && <span className="pz-badge pz-badge--neutral self-start md:hidden"><FlaskConical aria-hidden="true" />Demo mode · sample data</span>}
            {err ? <Notice tone="danger">{err}</Notice> : session ? children : <Loader label="Checking you're signed in…" />}
            <p className="text-caption text-ink-muted">Prototype with synthetic data. Not medical advice. Trial matches are preliminary; the trial team decides who can take part. In an emergency, call 999.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
