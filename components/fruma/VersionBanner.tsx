"use client";

import Link from "next/link";
import { FRUMA_VERSIONS, type FrumaVersion } from "@/lib/fruma/versions";

export function VersionBanner({ version }: { version: FrumaVersion }) {
  const current = FRUMA_VERSIONS[version];
  const other = FRUMA_VERSIONS[version === "demo" ? "test" : "demo"];
  const freeze =
    version === "demo"
      ? "Promoted spine live on Source / Confirm / Standardise + Factory Setup. Experiments still belong on Test."
      : "Safe to break. Promote accepted behaviour into Demo when ready.";

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
