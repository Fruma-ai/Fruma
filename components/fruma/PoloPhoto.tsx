"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function PoloPhoto({
  src,
  alt,
  className,
  label,
  objectPosition = "center",
}: {
  src: string;
  alt: string;
  className?: string;
  label?: string;
  objectPosition?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <figure className={cn("relative overflow-hidden bg-[#d8d4cc]", className)}>
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          style={{ objectPosition }}
          onError={() => setBroken(true)}
        />
      ) : null}
      {label ? (
        <figcaption className="absolute bottom-2 left-2 bg-paper/90 px-1.5 py-0.5 text-[11px] font-medium tracking-[-0.01em] text-ink/80">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}
