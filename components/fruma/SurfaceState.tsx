import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SurfaceState({
  kicker,
  title,
  body,
  action,
  tone = "idle",
  className,
}: {
  kicker: string;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  tone?: "idle" | "loading" | "empty" | "error";
  className?: string;
}) {
  return (
    <div
      className={cn("empty", className)}
      role={tone === "error" ? "alert" : tone === "loading" ? "status" : undefined}
    >
      {kicker ? (
        <p className="ui-label">
          {kicker}
        </p>
      ) : null}
      <h2 className={kicker ? "mt-2" : undefined}>{title}</h2>
      <p>{body}</p>
      {tone === "loading" && (
        <div
          className="mt-5 h-0.5 w-36 overflow-hidden bg-line"
          aria-hidden
        >
          <i className="block h-full w-1/2 bg-foreground motion-safe:animate-pulse" />
        </div>
      )}
      {action && (
        <Button
          className="mt-5"
          variant={tone === "error" ? "default" : "outline"}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
