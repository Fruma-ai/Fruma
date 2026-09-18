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
        <p className="tc-kicker">Source · brand-private shortlist</p>
        <h1>What this brand can actually answer.</h1>
        <p>
          Structured filters first. Relationship memory reorders; it never invents a mill, a
          colour, or a certificate. Excluded factories stay hidden. Hanger MOQ is historical.
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
          <span>Product brief</span>
          <select value={selected.id} onChange={(e) => { setProductId(e.target.value); setResult(null); }}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="tc-primary" disabled={busy} onClick={() => void runSource()}>
          {busy ? "Shortlisting…" : "Run Source"}
        </button>
      </div>

      {error ? <p className="tc-error" role="alert">{error}</p> : null}

      {result ? (
        <>
          <div className="tc-stats">
            <div><b>{result.candidates.length}</b><span>shortlist</span></div>
            <div><b>{result.excludedHidden}</b><span>excluded hidden</span></div>
            <div><b>{result.darkMillsSkipped}</b><span>dark mills skipped</span></div>
            <div>
              <b>{result.continuity.addedFactoryIds.length + result.continuity.removedFactoryIds.length}</b>
              <span>continuity exceptions</span>
            </div>
            <div><b>{result.brief.requirements.filter((r) => r.kind === "MUST").length}</b><span>MUST reqs</span></div>
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
                <div className="tc-meta">
                  <span className={`tc-pill ${mill.coverage}`}>{mill.coverage}</span>
                  <span>{mill.qualities} qualities</span>
                  <span>{mill.grantedArticles} granted articles</span>
                  <span className="tc-historical">
                    MOQ {mill.commercials.moqM}m · {mill.commercials.leadWeeks}w · historical
                  </span>
                </div>
                <ul className="tc-answer">
                  {mill.answerability.map((row) => (
                    <li key={row.requirementId}>
                      <em>{row.result}</em>
                      <span>{row.note}</span>
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
          Pick a {brand.name} product and run Source. Shortlists stay inside this tenant.
        </p>
      )}
    </section>
  );
}
