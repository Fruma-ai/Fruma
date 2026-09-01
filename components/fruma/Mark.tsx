import { cn } from "@/lib/utils";

export function Mark({
  className,
  size = 28,
  title = "Fruma",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      className={cn("shrink-0", className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <rect width="32" height="32" fill="#12141A" />
      <circle cx="8" cy="8" r="2.1" fill="#F4F2EC" />
      <rect x="18" y="22" width="10" height="2" fill="#C9A227" />
    </svg>
  );
}
