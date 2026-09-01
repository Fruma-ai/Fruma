"use client";

import { useFruma } from "./store";

export function ModeSwitch() {
  const { mode, enter } = useFruma();
  return (
    <div className="mode-switch" role="group" aria-label="Factory or studio">
      <button
        type="button"
        aria-pressed={mode === "mill"}
        onClick={() => enter("mill")}
      >
        Factory
      </button>
      <button
        type="button"
        aria-pressed={mode === "brand"}
        onClick={() => enter("brand")}
      >
        Studio
      </button>
    </div>
  );
}
