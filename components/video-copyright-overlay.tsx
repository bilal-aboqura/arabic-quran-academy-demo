"use client";

import { useEffect, useState } from "react";

export type VideoCopyrightOverlayProps = {
  code: string;
  label: string;
  dir: "rtl" | "ltr";
  style?: "floating" | "watermark";
};

const COPYRIGHT_POSITIONS = [
  { left: "76%", top: "18%" },
  { left: "24%", top: "68%" },
  { left: "24%", top: "24%" },
  { left: "76%", top: "62%" },
  { left: "50%", top: "20%" },
  { left: "50%", top: "66%" },
] as const;

type CopyrightPosition = (typeof COPYRIGHT_POSITIONS)[number];

function useCopyrightPosition(): CopyrightPosition {
  const [positionIndex, setPositionIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setPositionIndex((current) => (current + 1) % COPYRIGHT_POSITIONS.length),
      7_000
    );
    return () => clearInterval(id);
  }, []);

  return COPYRIGHT_POSITIONS[positionIndex];
}

function VideoCopyrightFloatingBadge({
  code,
  label,
  dir,
  position,
}: {
  code: string;
  label: string;
  dir: "rtl" | "ltr";
  position: CopyrightPosition;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[10] max-w-[min(90%,14rem)] -translate-x-1/2 -translate-y-1/2 select-none rounded-md border border-white/25 bg-black/60 px-2 py-1.5 text-[10px] font-semibold text-white/95 shadow-lg backdrop-blur-sm transition-[left,top] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none sm:text-[11px]"
      style={position}
      dir={dir}
      aria-hidden
    >
      <div className="text-[9px] font-normal text-white/75">{label}</div>
      <div className="font-mono tracking-widest">{code}</div>
    </div>
  );
}

function VideoCopyrightCenterWatermark({ code, position }: { code: string; position: CopyrightPosition }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[10] overflow-hidden select-none" aria-hidden>
      <div
        className="absolute max-w-[76%] -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={position}
      >
        <div className="-rotate-[20deg] text-center font-mono font-bold uppercase tracking-[0.22em] text-white/15 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] [font-size:clamp(1.4rem,6vw,4.5rem)]">
          {code}
        </div>
      </div>
    </div>
  );
}

export function VideoCopyrightOverlay({ code, label, dir, style = "floating" }: VideoCopyrightOverlayProps) {
  const position = useCopyrightPosition();

  return (
    <div className="pointer-events-none absolute inset-0">
      {style === "watermark" ? (
        <VideoCopyrightCenterWatermark code={code} position={position} />
      ) : (
        <VideoCopyrightFloatingBadge code={code} label={label} dir={dir} position={position} />
      )}
    </div>
  );
}
