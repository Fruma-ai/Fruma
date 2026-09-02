import Link from "next/link";
import { MillCardProvenance } from "@/components/fruma/MillCardProvenance";
import { millKind } from "@/lib/fruma/origin-mill";
import { millKey, type OriginFacility } from "@/lib/oshub/types";

export function OriginList({ facilities }: { facilities: OriginFacility[] }) {
  if (!facilities.length) {
    return (
      <p className="mt-12 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
        Nothing in this cut. Try another name, country, or mill type.
      </p>
    );
  }

  return (
    <ul className="mt-10 grid gap-px bg-white/10 sm:grid-cols-2">
      {facilities.map((f) => (
        <li key={millKey(f)} className="bg-black">
          <Link
            href={`/origin/${encodeURIComponent(millKey(f))}`}
            className="flex h-full flex-col justify-between gap-6 px-5 py-5 transition-colors hover:bg-white/[0.04]"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                {millKind(f)}
              </p>
              <p className="mill-name mt-3 text-[16px] font-medium tracking-[-0.02em] text-white">
                {f.name}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                {f.address}
                {f.countryName ? ` · ${f.countryName}` : ""}
              </p>
              {f.productTypes.length ? (
                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/40">
                  {f.productTypes.slice(0, 4).join(" · ")}
                </p>
              ) : null}
            </div>
            <MillCardProvenance />
          </Link>
        </li>
      ))}
    </ul>
  );
}
