import type { Metadata } from "next";
import Link from "next/link";
import { OriginList } from "@/components/fruma/OriginList";
import { OriginSearch } from "@/components/fruma/OriginSearch";
import { PublicBar } from "@/components/fruma/PublicBar";
import { searchOrigin } from "@/lib/oshub/search";
import { ORIGIN_PAGE_SIZE } from "@/lib/oshub/types";

export const metadata: Metadata = {
  title: "Factories",
  description:
    "Mills and factories on Fruma. Index cards first; mill files and market evidence make a mill ready.",
};

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function OriginPage({ searchParams }: PageProps<"/origin">) {
  const sp = await searchParams;
  const q = one(sp.q);
  const country = one(sp.country);
  const sector = one(sp.sector) || "all";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const result = await searchOrigin({ q, country, sector, page });
  const pages = Math.max(1, Math.ceil(result.count / ORIGIN_PAGE_SIZE));
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (country) qs.set("country", country);
  if (sector) qs.set("sector", sector);

  function href(p: number) {
    const next = new URLSearchParams(qs);
    if (p > 1) next.set("page", String(p));
    const s = next.toString();
    return s ? `/origin?${s}` : "/origin";
  }

  return (
    <div className="min-h-dvh bg-black text-white">
      <PublicBar active="origin" />
      <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-16 md:px-10 md:pt-20">
        <p className="manifest-stack">
          <span>Factories</span>
          <span>for brands</span>
          <span>and retailers</span>
        </p>
        <span className="manifest-rule" />
        <h1 className="max-w-[36ch] text-[18px] font-medium leading-snug tracking-[-0.03em] text-white/80 md:text-[22px]">
          An index card is not a score. Each mill is a Fruma card. Index
          records help us find who to bring onto the standard. A mill is ready
          when they claim the profile, file market evidence, and drop a hanger
          list.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[13px] leading-relaxed text-white/45">
          {result.count.toLocaleString("en-GB")} sites in this cut.
        </p>
        {result.error ? (
          <p className="mt-3 text-[13px] text-white/55" role="alert">
            {result.error}
          </p>
        ) : null}
        <OriginSearch q={q} country={country} sector={sector} />
        <OriginList facilities={result.facilities} />
        {pages > 1 ? (
          <nav className="mt-10 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/45">
            {page > 1 ? (
              <Link href={href(page - 1)} className="hover:text-white">
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span>
              {page} / {pages}
            </span>
            {page < pages ? (
              <Link href={href(page + 1)} className="hover:text-white">
                Next
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
        <p className="mt-14 max-w-[54ch] text-[11px] leading-relaxed text-white/30">
          Index records are public production locations. Fruma does not claim
          these factories as customers.{" "}
          <Link href="/" className="underline underline-offset-2">
            Back
          </Link>
        </p>
      </main>
    </div>
  );
}
