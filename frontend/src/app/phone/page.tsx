// Recording stage for the demo video: the real app in a 390×844 (iPhone-sized) frame, centred on a plain backdrop,
// so a screen recording can be dropped into a phone mockup later. Scales down to fit shorter windows.
"use client";
import { useEffect, useState } from "react";

const W = 390;
const H = 844;

export default function PhoneStage() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 32) / H, (window.innerWidth - 32) / W));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <main style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#1d1b2e" }}>
      <div style={{ width: W * scale, height: H * scale }}>
        <iframe src="/" title="PhaseZero" allow="camera; microphone"
          style={{ width: W, height: H, border: 0, background: "#faf9ff", transform: `scale(${scale})`, transformOrigin: "top left" }} />
      </div>
    </main>
  );
}
