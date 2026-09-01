"use client";

import { useEffect } from "react";
import { useFruma } from "./store";

export function Toast() {
  const { toast, clearToast } = useFruma();
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(clearToast, 3400);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);
  if (!toast) return null;
  return (
    <div
      className="toast-in pointer-events-none fixed bottom-6 left-1/2 z-80 max-w-[min(92vw,420px)] -translate-x-1/2 border border-line bg-canvas px-4 py-2.5 text-center text-[13px] tracking-[-0.015em] text-foreground shadow-[0_8px_24px_rgba(18,20,26,.12)]"
      role="status"
    >
      {toast}
    </div>
  );
}
