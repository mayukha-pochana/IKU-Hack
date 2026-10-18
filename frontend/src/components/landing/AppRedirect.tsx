// Inside the PhaseZero phone app (Capacitor), skip the marketing page and open on sign-in, like a real app.
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native";

export function AppRedirect() {
  const router = useRouter();
  useEffect(() => { if (isNativeApp()) router.replace("/login"); }, [router]);
  return null;
}
