import { cn } from "@/lib/utils";
import { Mark } from "./Mark";

/** 10mm origin-dot + weld-bar. Mapped / confirmed as-sent rows only. */
export function WeldTick({
  show,
  label = "Mapped and confirmed as sent",
  className,
}: {
  show: boolean;
  label?: string;
  className?: string;
}) {
  if (!show) return null;
  return (
    <Mark
      size="10mm"
      title={label}
      className={cn("inline-block align-middle", className)}
    />
  );
}
