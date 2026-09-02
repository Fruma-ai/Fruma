import Link from "next/link";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Wordmark";

export function PublicBar({
  active,
}: {
  active?: "origin" | "apply" | "platform";
}) {
  return (
    <header className="manifest-bar">
      <div className="manifest-bar-inner">
        <Link href="/" className="manifest-lockup" aria-label="Fruma home">
          <Wordmark />
        </Link>
        <nav className="ml-auto flex items-center gap-5 sm:gap-6">
          <Link
            href="/origin"
            className={cn(
              "manifest-nav",
              active === "origin" && "text-white",
            )}
          >
            Origin
          </Link>
          <Link
            href="/#apply"
            className={cn(
              "manifest-nav",
              active === "apply" && "text-white",
            )}
          >
            Apply
          </Link>
          <Link
            href="/app"
            className={cn(
              "manifest-nav",
              active === "platform" && "text-white",
            )}
          >
            Platform
          </Link>
        </nav>
      </div>
    </header>
  );
}
