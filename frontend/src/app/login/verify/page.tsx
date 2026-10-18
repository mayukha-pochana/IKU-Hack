// OWNER: Member 1
import { Suspense } from "react";
import { AuthShell } from "@/components/onboarding/AuthShell";
import { VerifyLink } from "@/components/onboarding/VerifyLink";
import { Loader } from "@/components/ui/pz";

export default function VerifyPage() {
  return <AuthShell><Suspense fallback={<Loader label="Signing you in…" />}><VerifyLink /></Suspense></AuthShell>;
}
