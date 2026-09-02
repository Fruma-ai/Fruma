import { millCardProvenance } from "@/lib/fruma/honesty";
import { cn } from "@/lib/utils";

export function MillCardProvenance({
  onFile = false,
  mapped = false,
  open = true,
}: {
  onFile?: boolean;
  mapped?: boolean;
  open?: boolean;
}) {
  const state = millCardProvenance({ onFile, mapped });
  const weld = state !== "index";
  const label =
    state === "mapped" ? "Mapped" : state === "on-file" ? "On file" : "On the index";
  return (
    <span
      className={cn(
        "text-[11px] uppercase tracking-[0.22em]",
        weld ? "text-weld" : "text-white/55",
      )}
    >
      {label}
      {open && state === "index" ? " · Open mill" : ""}
    </span>
  );
}
