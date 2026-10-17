// OWNER: Member 2 - visible label whenever the local sample-data preview is on (see lib/preview.ts).
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { isPreview, setPreview } from "@/lib/preview";

export function PreviewBanner() {
  const router = useRouter();
  const [on, setOn] = useState(false);
  useEffect(() => setOn(isPreview()), []);
  if (!on) return null;
  return (
    <div role="note" className="flex flex-wrap items-center justify-between gap-2 bg-warning-soft px-4 py-2 text-warning md:px-6">
      <p className="flex items-center gap-2 text-label"><Eye aria-hidden="true" size={18} />Preview mode: sample data in this browser only. Nothing is sent to the server.</p>
      <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm !text-warning underline" onClick={() => { setPreview(false); router.push("/login"); }}>Exit preview</button>
    </div>
  );
}
