// OWNER: Member 2 - ElevenLabs read-aloud via POST /api/voice/explain. Scripts are built server-side from confirmed data only.
"use client";
import { useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { voice } from "@/lib/api";
import type { VoiceExplain } from "@/types";
import { Spinner } from "./pz";

export function ReadAloud({ request, label = "Read aloud", small = false }: { request: VoiceExplain; label?: string; small?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);

  useEffect(() => () => { audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current); }, []);

  async function toggle() {
    if (state === "playing") { audio.current?.pause(); setState("idle"); return; }
    setState("loading");
    try {
      const blob = await voice.explain(request);
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(blob);
      audio.current = new Audio(url.current);
      audio.current.onended = () => setState("idle");
      await audio.current.play();
      setState("playing");
    } catch { setState("error"); }
  }

  const size = small ? { width: 36, minHeight: 36 } : undefined;
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="pz-btn pz-btn--icon" style={size} onClick={toggle} aria-label={state === "playing" ? "Stop reading" : label} aria-busy={state === "loading"}>
        {state === "loading" ? <Spinner /> : state === "playing" ? <Square aria-hidden="true" size={18} /> : <Volume2 aria-hidden="true" size={20} />}
      </button>
      {state === "error" && <span role="status" className="text-label font-normal text-danger">Read aloud isn&apos;t available right now.</span>}
    </span>
  );
}
