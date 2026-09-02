import { cn } from "@/lib/utils";

export function Wordmark({
  className,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  mark?: boolean;
}) {
  return (
    <span className={cn("brand-lockup", className)} aria-label="Fruma">
      <span aria-hidden="true">
        F<span className="lockup-optical">RUMA</span>
      </span>
    </span>
  );
}
