"use client";

import Link from "next/link";
import { FRUMA_VERSIONS, type FrumaVersion } from "@/lib/fruma/versions";

export function VersionBanner({ version }: { version: FrumaVersion }) {
  const current = FRUMA_VERSIONS[version];
  const other = FRUMA_VERSIONS[version === "demo" ? "test" : "demo"];
  const freeze =
    version === "demo"
      ? "Frozen for customers. Do not experiment here — use Test."
      : "Safe to break. Demo stays untouched until you promote.";

  return (
    <div className={`fv-banner fv-${version}`} role="status">
      <div className="fv-banner-copy">
        <span className="fv-pill">{current.label} version</span>
        <div className="fv-banner-text">
          <p>{current.description}</p>
          <p className="fv-freeze">{freeze}</p>
        </div>
      </div>
      <Link className="fv-switch" href={other.path}>
        Open {other.label}
      </Link>
    </div>
  );
}
