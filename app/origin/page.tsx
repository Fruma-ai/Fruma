import type { Metadata } from "next";
import Link from "next/link";
import { OriginList } from "@/components/fruma/OriginList";
import { OriginSearch } from "@/components/fruma/OriginSearch";
import { PublicBar } from "@/components/fruma/PublicBar";
import { searchOrigin } from "@/lib/oshub/search";
import { ORIGIN_PAGE_SIZE } from "@/lib/oshub/types";

export const metadata: Metadata = {
  title: "Origin",
  description:
    "Factories for brands and retailers. Mapped by Open Supply Hub.",
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
        <h1 className="max-w-[32ch] text-[18px] font-medium leading-snug tracking-[-0.03em] text-white/80 md:text-[22px]">
          The open map, from{" "}
          <a
            href="https://opensupplyhub.org/"
            className="underline decoration-white/30 underline-offset-4 hover:decoration-white"
          >
            Open Supply Hub
          </a>
          . Fruma works with factories that are ethical, sustainable, and meet
          EU and UK sourcing law.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[13px] leading-relaxed text-white/45">
          {result.source === "opensupplyhub"
            ? `${result.count.toLocaleString("en-GB")} production locations in this cut of the live OS Hub map.`
            : "A starter index of apparel and textile sites, each linked to Open Supply Hub. Connect an OS Hub API token to search the full live map (millions of locations)."}
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
          Production locations © their contributors, published on Open Supply Hub.
          Fruma does not claim these factories as customers.{" "}
          <Link href="/" className="underline underline-offset-2">
            Back
          </Link>
        </p>
      </main>
    </div>
  );
}
