// OWNER: Member 1 - landing page for the emailed magic link (/login/verify?token=...).
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/api";
import { Loader, Notice, errorMessage } from "@/components/ui/pz";
import { destinationAfterSignIn } from "./routing";

export function VerifyLink() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [err, setErr] = useState<string | null>(token ? null : "This link is missing its sign-in code.");

  useEffect(() => {
    if (!token) return;
    auth.verify(token).then(async () => router.replace(await destinationAfterSignIn())).catch((e) => setErr(errorMessage(e)));
  }, [token, router]);

  if (!err) return <Loader label="Signing you in…" />;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1">That link didn&apos;t work</h1>
      <Notice tone="danger">{err} Links work once and expire, so request a new one.</Notice>
      <Link href="/login" className="pz-btn pz-btn--primary self-start">Get a new link</Link>
    </div>
  );
}
