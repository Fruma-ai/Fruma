"use client";

import { useMemo } from "react";
import { TEST_FACTORIES, hangerCsvFor, type TestFactory } from "@/lib/fruma/test-corpus";
import { fabricBookFor } from "@/lib/fruma/intelligence/fabrics";
import type { FactoryCoverage } from "@/lib/fruma/intelligence/coverage";
import type { StandardField } from "@/lib/fruma/ingest/types";

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

export function TestClothPanel({
  factoryId,
  setFactoryId,
  overlays,
  byId,
}: {
  factoryId: string;
  setFactoryId: (id: string) => void;
  overlays: Record<string, StandardField>;
  byId: Map<string, FactoryCoverage>;
}) {
  const factory = TEST_FACTORIES.find((f) => f.id === factoryId) ?? TEST_FACTORIES[0];
  const book = useMemo(() => fabricBookFor(factory, overlays), [factory, overlays]);
  const health = byId.get(factory.id);
  const corpusRows = TEST_FACTORIES.reduce((sum, row) => sum + row.rowCount, 0);

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Cloth books · mill fabrics and materials</p>
        <h1>Mills file cloth. End products are what that cloth can become.</h1>
        <p>
          This is not a product hanger. Each row is a mill quality — construction, fibre, weight,
          colour as written. Fifty mill books hold {corpusRows} fabric/material rows. That mass is
          what tells a brand which garments can actually be made.
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
        <div className="tc-panel">
          <article className="tc-card">
            <p className="tc-kicker">{factory.id} · fabric book</p>
            <h2>{factory.name}</h2>
            {health ? (
              <div className="tc-meta">
                <span className={`tc-pill ${health.status}`}>{health.status}</span>
                <span>{book.qualities.length} mill qualities</span>
              </div>
            ) : null}
            <p>
              {book.qualities.length} fabrics / materials on file. End-product families below are
              read from mill wording — not a mill SKU list.
            </p>
            <div className="tc-meta">
              {book.endProductSupport.length ? (
                book.endProductSupport.map((item) => (
                  <span key={item.family}>
                    {item.family} · {item.qualityCount} qualities
                  </span>
                ))
              ) : (
                <span>No end-product reading until construction is on the file</span>
              )}
            </div>
            <div className="tc-actions">
              <button type="button" className="tc-primary" onClick={() => downloadCsv(factory)}>
                Download mill file
              </button>
            </div>
          </article>
          <div className="tc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Construction</th>
                  <th>Composition</th>
                  <th>Weight</th>
                  <th>Colour</th>
                  <th>Can become</th>
                </tr>
              </thead>
              <tbody>
                {book.qualities.slice(0, 24).map((quality) => (
                  <tr key={quality.articleCode}>
                    <td><code>{quality.articleCode}</code></td>
                    <td>
                      {quality.constructionAsWritten || "—"}
                      {quality.constructionMapped ? "" : " · unmapped"}
                    </td>
                    <td>{quality.compositionAsWritten || "—"}</td>
                    <td>{quality.weightAsWritten || "—"}</td>
                    <td>{quality.colourAsWritten || "—"}</td>
                    <td>{quality.possibleEndProducts.join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
