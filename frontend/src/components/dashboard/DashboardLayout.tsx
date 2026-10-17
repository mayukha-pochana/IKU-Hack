// OWNER: Member 2 - nav + page shell for all signed-in pages.
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/medications", label: "My Medications" },
  { href: "/trials", label: "Clinical Trials" },
  { href: "/check-in", label: "Health Check-In" },
  { href: "/profile", label: "My Profile" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  // TODO(M2): redirect to /login on 401 from auth.session()
  return (
    <div className="min-h-screen md:flex">
      <nav aria-label="Main" className="border-b md:w-60 md:border-b-0 md:border-r p-4">
        <p className="mb-4 text-xl font-bold text-brand-700">CareFlow AI</p>
        <ul className="flex gap-2 overflow-x-auto md:block md:space-y-1">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} aria-current={path === n.href ? "page" : undefined}
                className={cn("block rounded px-3 py-2 whitespace-nowrap", path === n.href ? "bg-brand-600 text-white" : "hover:bg-slate-100")}>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <button className="mt-4 text-sm underline" onClick={async () => { await auth.logout(); router.push("/"); }}>Sign out</button>
      </nav>
      <main className="flex-1 p-6">
        {children}
        <p className="mt-10 text-xs text-slate-600">
          Prototype with synthetic data. Not medical advice. Trial matches are preliminary and do not determine eligibility.
        </p>
      </main>
    </div>
  );
}
