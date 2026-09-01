import Link from "next/link";
import { cn } from "@/lib/utils";

export function PublicBar({
  active,
}: {
  active?: "origin" | "apply";
}) {
  return (
    <header className="manifest-bar">
      <div className="manifest-bar-inner">
        <Link href="/" className="manifest-lockup">
          Fruma
        </Link>
        <nav className="ml-auto flex items-center gap-6">
          <Link
            href="/origin"
            className={cn(
              "manifest-nav",
              active === "origin" && "text-white",
            )}
          >
            Origin
          </Link>
          <a
            href="/#apply"
            className={cn(
              "manifest-nav",
              active === "apply" && "text-white",
            )}
          >
            Apply
          </a>
        </nav>
      </div>
    </header>
  );
}
