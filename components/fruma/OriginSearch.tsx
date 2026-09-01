import { originCountries } from "@/lib/oshub/search";

const SECTORS = [
  ["Apparel", "Apparel"],
  ["Textile", "Textile"],
  ["Footwear", "Footwear"],
  ["all", "All sectors"],
] as const;

export function OriginSearch({
  q,
  country,
  sector,
}: {
  q: string;
  country: string;
  sector: string;
}) {
  const countries = originCountries();
  return (
    <form method="get" className="mt-10 grid gap-3 sm:grid-cols-[1fr_160px_160px_auto] sm:items-end">
      <label className="block">
        <span className="manifest-nav text-white/45">Name or OS ID</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="Mill, factory, city"
          className="mt-1.5 h-10 w-full border border-white/20 bg-transparent px-3 text-[14px] text-white outline-none placeholder:text-white/30 focus-visible:border-white"
        />
      </label>
      <label className="block">
        <span className="manifest-nav text-white/45">Country</span>
        <select
          name="country"
          defaultValue={country}
          className="mt-1.5 h-10 w-full border border-white/20 bg-black px-2 text-[13px] text-white outline-none focus-visible:border-white"
        >
          <option value="">All</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="manifest-nav text-white/45">Sector</span>
        <select
          name="sector"
          defaultValue={sector || "all"}
          className="mt-1.5 h-10 w-full border border-white/20 bg-black px-2 text-[13px] text-white outline-none focus-visible:border-white"
        >
          {SECTORS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="h-10 border border-white bg-white px-4 text-[11px] font-medium uppercase tracking-[0.22em] text-black hover:bg-transparent hover:text-white"
      >
        Search
      </button>
    </form>
  );
}
