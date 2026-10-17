// OWNER: Member 1
import type { Metadata } from "next";
import { AuthShell } from "@/components/onboarding/AuthShell";
import { LoginForm } from "@/components/onboarding/LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export default function LoginPage() { return <AuthShell><LoginForm /></AuthShell>; }
