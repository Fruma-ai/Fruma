"use client";

import {
  asSentDropHonesty,
  PROVENANCE,
  showWeldTick,
} from "@/lib/fruma/honesty";
import {
  asSentQualities,
  depositExceptions,
  formatMillDepositException,
  type MillDepositResponse,
} from "@/lib/fruma/mill-deposit";
import { WeldTick } from "./WeldTick";

export function AsSentList({
  deposits,
  kicker = "As sent",
  mapped = false,
  confirmed = false,
}: {
  deposits: MillDepositResponse[];
  kicker?: string;
  mapped?: boolean;
  confirmed?: boolean;
}) {
  const honesty = asSentDropHonesty();
  const rows = asSentQualities(deposits);
  const exceptions = depositExceptions(deposits);

  return (
    <section className="register-as-sent space-y-4">
      <div>
        <p className="ui-label">{kicker}</p>
        <p className="mt-1 text-[13px] text-mute">
          {rows.length} {rows.length === 1 ? "quality" : "qualities"} ·{" "}
          {PROVENANCE.asSent}. {honesty.mapped} · {honesty.review} ·{" "}
          {honesty.catalogue}.
        </p>
      </div>

      {exceptions.length > 0 ? (
        <ul className="space-y-2" role="list">
          {exceptions.map((exception, i) => (
            <li
              key={`${exception.depositId}-${exception.code}-${i}`}
              className="mill-card px-4 py-3"
              role="status"
            >
              <p className="spec text-[11px] text-mute">
                {exception.filename} · {exception.code}
              </p>
              <p className="mt-1 text-[13.5px] text-chalk">
                {formatMillDepositException(exception)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-[13px] text-mute">
          No as-sent deposits from this mill. A File drop appends here only —
          it does not change Seeded or On the standard.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Article</th>
                <th>Colourways</th>
                <th>Visibility</th>
                <th>File</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.depositId}-${row.baseQualityId}`}>
                  <td>
                    <p className="spec text-[12px] text-chalk">{row.millArticleCode}</p>
                    <p className="mt-0.5 spec text-[11px] text-mute">
                      {PROVENANCE.asSent}{" "}
                      <WeldTick
                        show={showWeldTick({
                          provenance: "as-sent",
                          mapped,
                          confirmed,
                        })}
                      />
                    </p>
                  </td>
                  <td className="spec text-[12px] text-mute">{row.colourwayIds.length}</td>
                  <td className="spec text-[12px] text-mute">{row.visibility}</td>
                  <td className="spec text-[12px] text-mute">{row.filename}</td>
                  <td className="spec text-[12px] text-mute">
                    {honesty.mapped} · {honesty.review}
                    <span className="mt-0.5 block">{honesty.catalogue}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
