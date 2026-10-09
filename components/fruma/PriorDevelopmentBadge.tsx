import type { PriorDevelopmentRecall } from "@/lib/fruma/design/catalog-card";

/** Read-only style-code status on the material discovery canvas. */
export function PriorDevelopmentBadge({ article_code, last_ordered_at }: PriorDevelopmentRecall) {
  const articleCode = article_code.trim();
  if (!articleCode) return null;
  return (
    <span
      data-last-ordered-at={last_ordered_at}
      className="inline-flex max-w-full items-center border border-zinc-800/60 px-1 py-0 text-[11px] font-medium uppercase leading-none tracking-[0.14em] text-zinc-400"
    >
      Prior Development: {articleCode}
    </span>
  );
}
