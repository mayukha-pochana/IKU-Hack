// OWNER: Member 1
import type { Metadata } from "next";
import { AuthShell } from "@/components/onboarding/AuthShell";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = { title: "Set up your profile" };
export default function OnboardingPage() { return <AuthShell><OnboardingFlow /></AuthShell>; }
