"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  TEST_BRANDS,
  TEST_FACTORIES,
  hangerCsvFor,
  linksForBrand,
  productsForBrand,
  type TestFactory,
} from "@/lib/fruma/test-corpus";
import { VersionBanner } from "@/components/fruma/VersionBanner";
import { scoreCorpusCoverage, type CorpusCoverage, type FactoryCoverage } from "@/lib/fruma/intelligence/coverage";
import type { StandardField } from "@/lib/fruma/ingest/types";
import type { HangerDialect } from "@/lib/fruma/test-corpus/types";
import { TestOverviewPanel } from "@/components/fruma/test/TestOverviewPanel";
import { TestSourcePanel } from "@/components/fruma/test/TestSourcePanel";

type Tab = "overview" | "brands" | "factories" | "hangers" | "lab" | "source";

const TABS: Tab[] = ["overview", "brands", "factories", "hangers", "lab", "source"];

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as string[]).includes(value);
}

function downloadCsv(factory: TestFactory) {
  const csv = hangerCsvFor(factory);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = factory.filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BrandsPanel({
  brandId,
  setBrandId,
  onSourceProduct,
}: {
  brandId: string;
  setBrandId: (id: string) => void;
  onSourceProduct: (brandId: string, productId: string) => void;
}) {
  const brand = TEST_BRANDS.find((b) => b.id === brandId) ?? TEST_BRANDS[0];
  const products = productsForBrand(brand.id);
  const links = linksForBrand(brand.id);
  const preferred = links.filter((l) => l.relationship === "preferred" || l.relationship === "proven");
  const excluded = links.filter((l) => l.relationship === "excluded");

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Brands</p>
        <h1>Tenant-private relationship memory</h1>
        <p>Each brand sees its own preferred / proven / excluded factory set. Nothing leaks across brands. Source uses this memory to reorder — never to invent a mill.</p>
      </header>
      <div className="tc-brand-tabs">
        {TEST_BRANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={b.id === brand.id ? "active" : ""}
            onClick={() => setBrandId(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>
      <div className="tc-grid two">
        <article className="tc-card">
          <p className="tc-kicker">{brand.id}</p>
          <h2>{brand.name}</h2>
          <p>{brand.summary}</p>
          <div className="tc-meta">
            <span>{preferred.length} preferred/proven</span>
            <span>{excluded.length} excluded</span>
            <span>{products.length} products</span>
          </div>
        </article>
        <article className="tc-card">
          <p className="tc-kicker">Products</p>
          <ul className="tc-list">
            {products.map((p) => (
              <li key={p.id}>
                <b>{p.sku}</b>
                <span>{p.name}</span>
                <button type="button" className="tc-link" onClick={() => onSourceProduct(brand.id, p.id)}>
                  Source
                </button>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <article className="tc-card">
        <p className="tc-kicker">Factory relationships · {brand.name}</p>
        <div className="tc-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Factory</th>
                <th>Relationship</th>
                <th>Granted articles</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              {links
                .filter((l) => l.relationship !== "new")
                .slice(0, 24)
                .map((link) => {
                  const factory = TEST_FACTORIES.find((f) => f.id === link.factoryId)!;
                  return (
                    <tr key={`${link.brandId}-${link.factoryId}`}>
                      <td>{factory.name}</td>
                      <td>{link.relationship}</td>
                      <td>{link.grantedArticles.length || "—"}</td>
                      <td>{factory.country}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function FactoriesPanel({
  factoryId,
  setFactoryId,
  byId,
}: {
  factoryId: string;
  setFactoryId: (id: string) => void;
  byId: Map<string, FactoryCoverage>;
}) {
  const factory = TEST_FACTORIES.find((f) => f.id === factoryId) ?? TEST_FACTORIES[0];
  const preview = useMemo(() => hangerCsvFor(factory).split("\n").slice(0, 8).join("\n"), [factory]);
  const health = byId.get(factory.id);

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Factories</p>
        <h1>Fifty mills with their own data dialects</h1>
        <p>
          Each factory owns a private hanger CSV. Coverage badges show whether ingest produced a
          searchable catalogue, a partial map, or a dark mill.
        </p>
      </header>
      <div className="tc-grid factories">
        <aside className="tc-factory-list">
          {TEST_FACTORIES.map((f) => {
            const row = byId.get(f.id);
            return (
              <button
                key={f.id}
                type="button"
                className={f.id === factory.id ? "active" : ""}
                onClick={() => setFactoryId(f.id)}
              >
                <b>{f.name}</b>
                <span>
                  {f.country} · {f.dialect}
                  {row ? ` · ${row.status}` : ""}
                </span>
              </button>
            );
          })}
        </aside>
        <article className="tc-card">
          <p className="tc-kicker">{factory.id}</p>
          <h2>{factory.name}</h2>
          {health ? (
            <div className="tc-meta">
              <span className={`tc-pill ${health.status}`}>{health.status}</span>
              <span>{health.qualities} qualities</span>
              <span>{health.mappedCellPct}% cells mapped</span>
            </div>
          ) : null}
          {health?.blocker ? <p className="tc-error">{health.blocker}</p> : null}
          <p>
            {factory.region}, {factory.country}. MOQ {factory.moqM}m · lead {factory.leadWeeks} weeks
            <span className="tc-historical"> · historical until mill-confirmed</span>.
          </p>
          <div className="tc-meta">
            <span>{factory.specialties.join(" · ")}</span>
            <span>{factory.certifications.join(" · ") || "No programme on file"}</span>
            <span>{factory.markets.join(" / ")}</span>
          </div>
          {health?.unmappedHeaders.length ? (
            <p>Silent headers: {health.unmappedHeaders.join(" · ")}</p>
          ) : null}
          <div className="tc-actions">
            <button type="button" className="tc-primary" onClick={() => downloadCsv(factory)}>
              Download {factory.filename}
            </button>
            <a className="tc-secondary" href={`/api/test/factories/${factory.id}/hanger`}>
              API CSV
            </a>
          </div>
          <pre className="tc-preview">{preview}</pre>
        </article>
      </div>
    </section>
  );
}

function HangersPanel({ byId }: { byId: Map<string, FactoryCoverage> }) {
  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Hanger index</p>
        <h1>All factory datasets</h1>
        <p>Download any hanger file, or open Lab to run Test-only ingest without touching Demo.</p>
      </header>
      <div className="tc-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Factory</th>
              <th>Dialect</th>
              <th>Coverage</th>
              <th>Qualities</th>
              <th>Silent headers</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {TEST_FACTORIES.map((factory) => {
              const row = byId.get(factory.id);
              return (
                <tr key={factory.id}>
                  <td>{factory.name}</td>
                  <td>{factory.dialect}</td>
                  <td>{row ? <span className={`tc-pill ${row.status}`}>{row.status}</span> : "—"}</td>
                  <td>{row?.qualities ?? "—"}</td>
                  <td>{row?.unmappedHeaders.join(", ") || "—"}</td>
                  <td>
                    <button type="button" className="tc-link" onClick={() => downloadCsv(factory)}>
                      Download
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type LabResult = {
  surface: string;
  factoryId: string;
  factoryName: string;
  dialect: string;
  unmappedHeaders?: string[];
  coverage?: FactoryCoverage;
  deposit: {
    depositId: string;
    filename: string;
    qualities: { baseQualityId: string; millArticleCode: string }[];
    exceptions: { code: string; message: string }[];
  };
};

function LabPanel({
  factoryId,
  setFactoryId,
  byId,
}: {
  factoryId: string;
  setFactoryId: (id: string) => void;
  byId: Map<string, FactoryCoverage>;
}) {
  const factory = useMemo(
    () => TEST_FACTORIES.find((f) => f.id === factoryId) ?? TEST_FACTORIES[0],
    [factoryId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabResult | null>(null);
  const previewHealth = byId.get(factory.id);

  async function runIngest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/test/ingest", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({ factoryId: factory.id }),
      });
      const json = (await res.json()) as LabResult & { error?: string };
      if (!res.ok) {
        setResult(null);
        setError(json.error ?? `Ingest failed (${res.status})`);
        return;
      }
      setResult(json);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setBusy(false);
    }
  }

  const unmapped = result?.unmappedHeaders ?? previewHealth?.unmappedHeaders ?? [];
  const exceptions = result?.deposit.exceptions ?? [];

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Lab · test only</p>
        <h1>Harness factory data without touching Demo</h1>
        <p>
          Runs the selected hanger through the <strong>Test</strong> ingest engine. Confirmed
          dialect overlays apply. Unmapped headers are mapping work even when there is no
          empty-article exception.
        </p>
      </header>
      <div className="tc-lab">
        <label className="tc-lab-pick">
          <span>Factory</span>
          <select value={factory.id} onChange={(e) => setFactoryId(e.target.value)}>
            {TEST_FACTORIES.map((f) => {
              const row = byId.get(f.id);
              return (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.dialect} · {row?.status ?? "unscored"}
                </option>
              );
            })}
          </select>
        </label>
        <button type="button" className="tc-primary" disabled={busy} onClick={() => void runIngest()}>
          {busy ? "Running…" : "Run Test ingest"}
        </button>
      </div>
      {previewHealth ? (
        <p>
          Before deposit: <span className={`tc-pill ${previewHealth.status}`}>{previewHealth.status}</span>{" "}
          · {previewHealth.qualities} qualities · {previewHealth.mappedCellPct}% cells mapped
        </p>
      ) : null}
      {error ? <p className="tc-error" role="alert">{error}</p> : null}
      {result ? (
        <div className="tc-lab-result">
          <p className="tc-kicker">
            {result.surface} · {result.factoryName} · {result.dialect}
            {result.coverage ? ` · ${result.coverage.status}` : ""}
          </p>
          <p>
            Deposit <code>{result.deposit.depositId}</code> · {result.deposit.qualities.length}{" "}
            qualities · {exceptions.length} row exceptions · {unmapped.length} silent headers
          </p>
          <ul>
            {result.deposit.qualities.slice(0, 12).map((q) => (
              <li key={q.baseQualityId}>
                <code>{q.millArticleCode}</code> → {q.baseQualityId}
              </li>
            ))}
            {result.deposit.qualities.length > 12 ? (
              <li>+{result.deposit.qualities.length - 12} more</li>
            ) : null}
          </ul>
          {unmapped.length > 0 ? (
            <div className="tc-lab-exceptions">
              <p className="tc-kicker">Silent headers (not exceptions — mapping fuel)</p>
              <ul>
                {unmapped.map((header) => (
                  <li key={header}><code>{header}</code></li>
                ))}
              </ul>
            </div>
          ) : null}
          {exceptions.length > 0 ? (
            <div className="tc-lab-exceptions">
              <p className="tc-kicker">Row exceptions</p>
              <ul>
                {exceptions.slice(0, 8).map((e, i) => (
                  <li key={`${e.code}-${i}`}>
                    <code>{e.code}</code> {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {unmapped.length === 0 && exceptions.length === 0 ? (
            <p>This dialect is on the standard. Qualities are still Private until a named grant.</p>
          ) : null}
          {result.deposit.qualities.length === 0 && unmapped.length > 0 ? (
            <p className="tc-error">
              File received. Not mapped. Not a live catalogue — article identity never attached.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function TestCorpusPlatform() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "overview";
  const [brandId, setBrandId] = useState(TEST_BRANDS[0].id);
  const [factoryId, setFactoryId] = useState(TEST_FACTORIES[0].id);
  const [overlays, setOverlays] = useState<Record<string, StandardField>>({});
  const [mapBusy, setMapBusy] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const brandParam = searchParams.get("brand");
    if (brandParam && TEST_BRANDS.some((b) => b.id === brandParam)) {
      setBrandId(brandParam);
    }
  }, [searchParams]);

  const coverage: CorpusCoverage = useMemo(() => scoreCorpusCoverage(overlays), [overlays]);
  const byId = useMemo(
    () => new Map(coverage.factories.map((row) => [row.factoryId, row])),
    [coverage],
  );

  const setTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/test/mapping", {
          credentials: "same-origin",
          headers: { "X-Fruma-Version": "test" },
        });
        if (!res.ok) return;
        const json = (await res.json()) as { overlays?: Record<string, StandardField> };
        if (!cancelled && json.overlays) setOverlays(json.overlays);
      } catch {
        /* Overview still scores locally with builtin aliases. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmDialect(dialect: HangerDialect) {
    setMapBusy(true);
    setMapError(null);
    try {
      const res = await fetch("/api/test/mapping", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({ dialect }),
      });
      const json = (await res.json()) as {
        error?: string;
        overlays?: Record<string, StandardField>;
      };
      if (!res.ok || !json.overlays) {
        setMapError(json.error ?? `Mapping confirm failed (${res.status})`);
        return;
      }
      setOverlays(json.overlays);
    } catch (err) {
      setMapError(err instanceof Error ? err.message : "Mapping confirm failed");
    } finally {
      setMapBusy(false);
    }
  }

  return (
    <div className="tc-shell">
      <VersionBanner version="test" />
      <header className="tc-top">
        <div>
          <p className="tc-kicker">Fruma · test</p>
          <strong>Test corpus workspace</strong>
        </div>
        <nav className="tc-nav" aria-label="Test corpus sections">
          {(
            [
              ["overview", "Overview"],
              ["source", "Source"],
              ["brands", "Brands"],
              ["factories", "Factories"],
              ["hangers", "Hangers"],
              ["lab", "Lab"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="tc-main">
        {tab === "overview" ? (
          <TestOverviewPanel
            coverage={coverage}
            overlays={overlays}
            busy={mapBusy}
            error={mapError}
            onConfirmDialect={(dialect) => void confirmDialect(dialect)}
            onOpenSource={() => setTab("source")}
            onOpenLab={() => setTab("lab")}
          />
        ) : null}
        {tab === "source" ? <TestSourcePanel brandId={brandId} setBrandId={setBrandId} /> : null}
        {tab === "brands" ? (
          <BrandsPanel
            brandId={brandId}
            setBrandId={setBrandId}
            onSourceProduct={(nextBrand, productId) => {
              setBrandId(nextBrand);
              const params = new URLSearchParams(searchParams.toString());
              params.set("tab", "source");
              params.set("brand", nextBrand);
              params.set("product", productId);
              router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }}
          />
        ) : null}
        {tab === "factories" ? (
          <FactoriesPanel factoryId={factoryId} setFactoryId={setFactoryId} byId={byId} />
        ) : null}
        {tab === "hangers" ? <HangersPanel byId={byId} /> : null}
        {tab === "lab" ? <LabPanel factoryId={factoryId} setFactoryId={setFactoryId} byId={byId} /> : null}
      </main>
    </div>
  );
}
