"use client";

import Link from "next/link";
import { FRUMA_VERSIONS, type FrumaVersion } from "@/lib/fruma/versions";

export function VersionBanner({ version }: { version: FrumaVersion }) {
  const current = FRUMA_VERSIONS[version];
  const other = FRUMA_VERSIONS[version === "demo" ? "test" : "demo"];
  const freeze =
    version === "demo"
      ? "Do not experiment here — switch to Test for Lab and agents."
      : "Demo stays untouched until you explicitly promote.";

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
