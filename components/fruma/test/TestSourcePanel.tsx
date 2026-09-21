"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { surfaceStorageKey } from "@/lib/fruma/surfaces";
import { TEST_BRANDS, TEST_PRODUCTS, productsForBrand } from "@/lib/fruma/test-corpus";
import type { SourceShortlist } from "@/lib/fruma/intelligence/retrieval";

function baselineKey(brandId: string, productId: string) {
  return surfaceStorageKey("test", `source-baseline:${brandId}:${productId}`);
}

function readBaseline(brandId: string, productId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(baselineKey(brandId, productId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeBaseline(brandId: string, productId: string, factoryIds: string[]) {
  window.sessionStorage.setItem(baselineKey(brandId, productId), JSON.stringify(factoryIds));
}

export function TestSourcePanel({
  brandId,
  setBrandId,
}: {
  brandId: string;
  setBrandId: (id: string) => void;
}) {
  const searchParams = useSearchParams();
  const productFromUrl = searchParams.get("product");
  const brand = TEST_BRANDS.find((b) => b.id === brandId) ?? TEST_BRANDS[0];
  const products = productsForBrand(brand.id);
  const defaultProduct =
    products.find((p) => p.id === productFromUrl) ??
    products.find((p) => /navy/i.test(p.name)) ??
    products[0] ??
    TEST_PRODUCTS[0];
  const [productId, setProductId] = useState(defaultProduct.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SourceShortlist | null>(null);
  const [isolation, setIsolation] = useState<
    { brandId: string; brandName: string; factoryId: string; relationship: string }[] | null
  >(null);

  useEffect(() => {
    if (productFromUrl && products.some((p) => p.id === productFromUrl)) {
      setProductId(productFromUrl);
    }
  }, [productFromUrl, products]);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? defaultProduct,
    [products, productId, defaultProduct],
  );

  async function runSource() {
    setBusy(true);
    setError(null);
    try {
      const priorFactoryIds = readBaseline(brand.id, selected.id);
      const res = await fetch("/api/test/source", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({
          brandId: brand.id,
          productId: selected.id,
          priorFactoryIds,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        shortlist?: SourceShortlist;
        isolation?: { brandId: string; brandName: string; factoryId: string; relationship: string }[];
      };
      if (!res.ok || !json.shortlist) {
        setResult(null);
        setError(json.error ?? `Source failed (${res.status})`);
        return;
      }
      setResult(json.shortlist);
      setIsolation(json.isolation ?? null);
      writeBaseline(
        brand.id,
        selected.id,
        json.shortlist.candidates.map((c) => c.factoryId),
      );
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Source failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Source · cloth that can become this product</p>
        <h1>Which mill fabrics can become this end product.</h1>
        <p>
          Mills submit fabrics and materials — not product hangers. Fruma reads that mass of cloth
          and names which garments it can support. Relationship memory reorders mills; it never
          invents a quality, a colour, or a certificate.
        </p>
      </header>

      <div className="tc-brand-tabs">
        {TEST_BRANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={b.id === brand.id ? "active" : ""}
            onClick={() => {
              setBrandId(b.id);
              const next = productsForBrand(b.id)[0];
              if (next) setProductId(next.id);
              setResult(null);
            }}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="tc-lab">
        <label className="tc-lab-pick">
          <span>End product to make</span>
          <select value={selected.id} onChange={(e) => { setProductId(e.target.value); setResult(null); }}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="tc-primary" disabled={busy} onClick={() => void runSource()}>
          {busy ? "Matching cloth…" : "Match fabrics"}
        </button>
      </div>

      {error ? <p className="tc-error" role="alert">{error}</p> : null}

      {result ? (
        <>
          <div className="tc-stats tc-stats-six">
            <div><b>{result.candidates.length}</b><span>mill books</span></div>
            <div><b>{result.matchingFabricTotal}</b><span>matching fabrics</span></div>
            <div><b>{result.excludedHidden}</b><span>excluded hidden</span></div>
            <div><b>{result.darkMillsSkipped}</b><span>dark mill books</span></div>
            <div><b>{result.fabricMisses}</b><span>books without that cloth</span></div>
            <div>
              <b>{result.continuity.addedFactoryIds.length + result.continuity.removedFactoryIds.length}</b>
              <span>continuity exceptions</span>
            </div>
          </div>

          <article className="tc-card">
            <p className="tc-kicker">{result.brief.sku}</p>
            <h2>{result.brief.productName}</h2>
            <p>{result.brief.intent}</p>
            <ul className="tc-req">
              {result.brief.requirements.map((req) => (
                <li key={req.id}>
                  <em>{req.kind}</em>
                  <b>{req.label}</b>
                  <span>{req.value}</span>
                </li>
              ))}
            </ul>
          </article>

          {result.continuity.priorProductId &&
          (result.continuity.addedFactoryIds.length || result.continuity.removedFactoryIds.length) ? (
            <p className="tc-continuity">
              Exception-only vs last run for this brand/product: added{" "}
              {result.continuity.addedFactoryIds.length}, removed{" "}
              {result.continuity.removedFactoryIds.length}. Unchanged mills stay quiet.
            </p>
          ) : (
            <p className="tc-continuity">
              First run for this brief is the baseline. Next run only surfaces what changed.
            </p>
          )}

          {isolation ? (
            <article className="tc-card">
              <p className="tc-kicker">Tenant moat · factory-001</p>
              <h2>Same mill. Three private relationships.</h2>
              <div className="tc-meta">
                {isolation.map((row) => (
                  <span key={row.brandId}>
                    {row.brandName}: {row.relationship}
                  </span>
                ))}
              </div>
            </article>
          ) : null}

          <div className="tc-grid source-cards">
            {result.candidates.map((mill) => (
              <article key={mill.factoryId} className="tc-card tc-source-card">
                <p className="tc-kicker">
                  {mill.country} · {mill.dialect} · {mill.relationship}
                </p>
                <h2>{mill.factoryName}</h2>
                <p className="tc-muted">
                  {mill.matchingFabricCount} mill fabrics can become {mill.endProduct ?? "this product"}.
                  The mill did not submit that garment.
                </p>
                <div className="tc-meta">
                  <span className={`tc-pill ${mill.coverage}`}>{mill.coverage}</span>
                  <span>{mill.qualities} qualities in book</span>
                  <span className="tc-historical">
                    MOQ {mill.commercials.moqM}m · {mill.commercials.leadWeeks}w · historical
                  </span>
                </div>
                <ul className="tc-fabric">
                  {mill.matchedFabrics.map((fabric) => (
                    <li key={fabric.articleCode}>
                      <code>{fabric.articleCode}</code>
                      <span>
                        {fabric.constructionAsWritten} · {fabric.compositionAsWritten} · {fabric.weightAsWritten}
                        {fabric.colourAsWritten ? ` · ${fabric.colourAsWritten}` : ""}
                      </span>
                      <em>can become {fabric.possibleEndProducts.join(" · ")}</em>
                      {fabric.citations && fabric.citations.length > 0 ? (
                        <ul className="tc-cite">
                          {fabric.citations.slice(0, 4).map((c) => (
                            <li key={`${c.field}-${c.row}-${c.column}`}>
                              {c.sheet}!{c.column}
                              {c.row} · “{c.header}” = {c.sourceValue}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <ul className="tc-answer">
                  {mill.answerability.map((row) => (
                    <li key={row.requirementId}>
                      <em>{row.result}</em>
                      <span>
                        {row.note}
                        {row.citations && row.citations.length > 0 ? (
                          <ul className="tc-cite">
                            {row.citations.slice(0, 3).map((c) => (
                              <li key={`${row.requirementId}-${c.field}-${c.row}-${c.column}`}>
                                {c.sheet}!{c.column}
                                {c.row} · “{c.header}” = {c.sourceValue}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
                <ul className="tc-evidence">
                  {mill.evidence.map((flag) => (
                    <li key={flag.code} className={flag.severity}>
                      <b>{flag.title}</b>
                      <span>{flag.detail}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="tc-muted">
          Pick a {brand.name} end product. Source matches mill fabrics, not factory product lists.
        </p>
      )}
    </section>
  );
}
