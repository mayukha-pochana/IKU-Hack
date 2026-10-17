// Shared brand component (PhaseZero design system). Used by the landing Navbar, login and DashboardLayout.
// Logo files are copied unchanged from the design system into public/brand/.
import Link from "next/link";

export const BRAND = {
  name: "PhaseZero",
  tagline: "Fill in once. Every trial checked, explained in plain English.",
} as const;

export function Logo({ href = "/", width = 152, className = "" }: { href?: string; width?: number; className?: string }) {
  return (
    <Link href={href} className={`inline-flex shrink-0 items-center ${className}`} aria-label={`${BRAND.name} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/phasezero-lockup-light.svg" alt="" width={width} height={Math.round(width * 42 / 288)} />
    </Link>
  );
}

export function LogoIcon({ size = 32 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/phasezero-icon.svg" alt="" width={size} height={size} />;
}
