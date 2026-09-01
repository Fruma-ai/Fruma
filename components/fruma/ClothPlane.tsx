import { clothBackground } from "@/lib/fruma/cloth";
import type { FabricStructure } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";

export function ClothPlane({
  structure,
  hex,
  className,
  punched = true,
  gsm,
}: {
  structure: FabricStructure;
  hex: string;
  className?: string;
  punched?: boolean;
  gsm?: string;
}) {
  return (
    <div
      className={cn("cloth-plane relative overflow-hidden", className)}
      style={{ backgroundImage: clothBackground(structure, hex) }}
    >
      {punched && <span className="punch" />}
      {gsm && (
        <span className="spec absolute right-3 bottom-3 z-2 bg-ink/80 px-1.5 py-0.5 text-[11px] text-white">
          {gsm}
        </span>
      )}
    </div>
  );
}
