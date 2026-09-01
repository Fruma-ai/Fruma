import { OSHUB_PROFILE, OSHUB_SEARCH, type OriginFacility } from "@/lib/oshub/types";

function href(f: OriginFacility) {
  if (f.osId) return `${OSHUB_PROFILE}${f.osId}`;
  return `${OSHUB_SEARCH}?q=${encodeURIComponent(f.name)}`;
}

export function OriginList({ facilities }: { facilities: OriginFacility[] }) {
  if (!facilities.length) {
    return (
      <p className="mt-12 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
        Nothing in this cut of the map. Try another name, country, or sector.
      </p>
    );
  }

  return (
    <ul className="mt-10 divide-y divide-white/10 border-t border-white/10">
      {facilities.map((f) => (
        <li key={`${f.osId || f.name}-${f.address}`}>
          <a
            href={href(f)}
            target="_blank"
            rel="noreferrer"
            className="grid gap-1 py-4 text-white/90 transition-colors hover:text-white md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto] md:items-baseline md:gap-6"
          >
            <span className="text-[15px] font-medium tracking-[-0.02em]">{f.name}</span>
            <span className="text-[12px] tracking-[0.04em] text-white/50">
              {f.address}
              {f.countryName ? ` · ${f.countryName}` : ""}
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              {f.sectors.join(" · ") || "—"}
            </span>
            <span className="font-mono text-[11px] tracking-[0.04em] text-white/35">
              {f.osId || "OS Hub"}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
