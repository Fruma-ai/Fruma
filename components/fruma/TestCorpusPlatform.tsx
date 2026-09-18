"use client";

import { useMemo, useState } from "react";
import {
  TEST_BRANDS,
  TEST_FACTORIES,
  hangerCsvFor,
  linksForBrand,
  productsForBrand,
  testCorpusSummary,
  type TestFactory,
} from "@/lib/fruma/test-corpus";
import { VersionBanner } from "@/components/fruma/VersionBanner";

type Tab = "overview" | "brands" | "factories" | "hangers";

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

function Overview() {
  const summary = testCorpusSummary();
  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Test corpus</p>
        <h1>Three brands. Fifty factories. Private hanger files.</h1>
        <p>
          This surface is for engineering and founder testing. The customer demo stays on{" "}
          <code>/app</code> until you promote changes.
        </p>
      </header>
      <div className="tc-stats">
        <div><b>{summary.brands}</b><span>brands</span></div>
        <div><b>{summary.factories}</b><span>factories</span></div>
        <div><b>{summary.products}</b><span>products</span></div>
        <div><b>{summary.hangerRows}</b><span>hanger rows</span></div>
        <div><b>{summary.links}</b><span>brand↔factory links</span></div>
      </div>
      <div className="tc-grid three">
        {TEST_BRANDS.map((brand) => (
          <article key={brand.id} className="tc-card">
            <p className="tc-kicker">{brand.hq} · {brand.market}</p>
            <h2>{brand.name}</h2>
            <p>{brand.summary}</p>
            <small>{brand.categoryFocus.join(" · ")}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function BrandsPanel({
  brandId,
  setBrandId,
}: {
  brandId: string;
  setBrandId: (id: string) => void;
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
        <p>Each brand sees its own preferred / proven / excluded factory set. Nothing leaks across brands.</p>
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
                <em>{p.stage}</em>
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
}: {
  factoryId: string;
  setFactoryId: (id: string) => void;
}) {
  const factory = TEST_FACTORIES.find((f) => f.id === factoryId) ?? TEST_FACTORIES[0];
  const preview = useMemo(() => hangerCsvFor(factory).split("\n").slice(0, 8).join("\n"), [factory]);

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Factories</p>
        <h1>Fifty mills with their own data dialects</h1>
        <p>
          Each factory owns a private hanger CSV. Dialects vary (PT / IT / TR / UK imperial / PL / messy)
          so ingest and mapping can be tested against real variance.
        </p>
      </header>
      <div className="tc-grid factories">
        <aside className="tc-factory-list">
          {TEST_FACTORIES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={f.id === factory.id ? "active" : ""}
              onClick={() => setFactoryId(f.id)}
            >
              <b>{f.name}</b>
              <span>{f.country} · {f.rowCount} rows · {f.dialect}</span>
            </button>
          ))}
        </aside>
        <article className="tc-card">
          <p className="tc-kicker">{factory.id}</p>
          <h2>{factory.name}</h2>
          <p>
            {factory.region}, {factory.country}. MOQ {factory.moqM}m · lead {factory.leadWeeks} weeks.
          </p>
          <div className="tc-meta">
            <span>{factory.specialties.join(" · ")}</span>
            <span>{factory.certifications.join(" · ") || "No programme on file"}</span>
            <span>{factory.markets.join(" / ")}</span>
          </div>
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

function HangersPanel() {
  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Hanger index</p>
        <h1>All factory datasets</h1>
        <p>Download any hanger file to run through mill File → Map → Review, or hit the ingest API later.</p>
      </header>
      <div className="tc-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Factory</th>
              <th>Dialect</th>
              <th>Rows</th>
              <th>File</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {TEST_FACTORIES.map((factory) => (
              <tr key={factory.id}>
                <td>{factory.name}</td>
                <td>{factory.dialect}</td>
                <td>{factory.rowCount}</td>
                <td><code>{factory.filename}</code></td>
                <td>
                  <button type="button" className="tc-link" onClick={() => downloadCsv(factory)}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TestCorpusPlatform() {
  const [tab, setTab] = useState<Tab>("overview");
  const [brandId, setBrandId] = useState(TEST_BRANDS[0].id);
  const [factoryId, setFactoryId] = useState(TEST_FACTORIES[0].id);

  return (
    <div className="tc-shell">
      <VersionBanner version="test" />
      <header className="tc-top">
        <div>
          <p className="tc-kicker">Fruma · test</p>
          <strong>Test corpus workspace</strong>
        </div>
        <nav className="tc-nav">
          {(
            [
              ["overview", "Overview"],
              ["brands", "Brands"],
              ["factories", "Factories"],
              ["hangers", "Hangers"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="tc-main">
        {tab === "overview" ? <Overview /> : null}
        {tab === "brands" ? <BrandsPanel brandId={brandId} setBrandId={setBrandId} /> : null}
        {tab === "factories" ? (
          <FactoriesPanel factoryId={factoryId} setFactoryId={setFactoryId} />
        ) : null}
        {tab === "hangers" ? <HangersPanel /> : null}
      </main>
    </div>
  );
}
