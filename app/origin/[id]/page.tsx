import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicBar } from "@/components/fruma/PublicBar";
import { MillCardProvenance } from "@/components/fruma/MillCardProvenance";
import { millKind } from "@/lib/fruma/origin-mill";
import { INDEX_FILTER_LABEL } from "@/lib/fruma/honesty";
import { getOriginFacility } from "@/lib/oshub/search";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/origin/[id]">): Promise<Metadata> {
  const { id } = await params;
  const mill = await getOriginFacility(id);
  return {
    title: mill?.name ?? "Mill",
    description: mill
      ? `${mill.name}, ${mill.countryName}. Fruma mill card.`
      : "Fruma mill card.",
  };
}

export default async function OriginMillPage({
  params,
}: PageProps<"/origin/[id]">) {
  const { id } = await params;
  const mill = await getOriginFacility(id);
  if (!mill) notFound();
  const kind = millKind(mill);

  return (
    <div className="min-h-dvh bg-black text-white">
      <PublicBar active="origin" />
      <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-16 md:px-10 md:pt-20">
        <p className="ui-label text-white/45">{kind}</p>
        <h1 className="page-title mill-name mt-2 text-white md:text-[28px]">{mill.name}</h1>
        <p className="mt-3">
          <MillCardProvenance open={false} />
        </p>
        <span className="manifest-rule" />
        <p className="max-w-[42ch] text-[14px] leading-relaxed text-white/55">
          {mill.address}
          {mill.countryName ? ` · ${mill.countryName}` : ""}. On the Fruma
          index. Not claimed. Market evidence and a hanger list are what make
          this mill ready.
        </p>

        <div className="mt-12 space-y-px bg-white/10">
          <Fact k="Identity" v={mill.name} millName />
          <Fact k="Place" v={`${mill.address}${mill.countryName ? ` · ${mill.countryName}` : ""}`} />
          <Fact k="Type" v={kind} />
          <Fact
            k="What they make"
            v={mill.productTypes.length ? mill.productTypes.join(" · ") : mill.sectors.join(" · ") || "—"}
          />
          <Fact k="Market evidence" v="Not on file" />
          <Fact k="Hanger list" v="Not mapped to the Fruma standard" />
          <Fact k="Status" v="Index only — not ready" />
        </div>

        <p className="mt-14">
          <Link href="/origin" className="manifest-nav">
            {INDEX_FILTER_LABEL}
          </Link>
        </p>
      </main>
    </div>
  );
}

function Fact({ k, v, millName }: { k: string; v: string; millName?: boolean }) {
  return (
    <div className="grid gap-1 bg-black px-5 py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-baseline">
      <p className="ui-label text-white/40">{k}</p>
      <p className={millName ? "mill-name text-[14px] text-white/85" : "text-[14px] text-white/85"}>{v}</p>
    </div>
  );
}
