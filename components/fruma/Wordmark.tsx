import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  mark?: boolean;
}) {
  const sizes = {
    sm: "text-[16px]",
    md: "text-[20px]",
    lg: "text-[28px] md:text-[34px]",
  };
  return (
    <span className={cn("wordmark", sizes[size], className)}>
      Fruma<span className="dot">.</span>
    </span>
  );
}
