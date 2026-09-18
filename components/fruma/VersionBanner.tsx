"use client";

import Link from "next/link";
import { FRUMA_VERSIONS, type FrumaVersion } from "@/lib/fruma/versions";

export function VersionBanner({ version }: { version: FrumaVersion }) {
  const current = FRUMA_VERSIONS[version];
  const other = FRUMA_VERSIONS[version === "demo" ? "test" : "demo"];

  return (
    <div className={`fv-banner fv-${version}`} role="status">
      <div className="fv-banner-copy">
        <span className="fv-pill">{current.label} version</span>
        <p>{current.description}</p>
      </div>
      <Link className="fv-switch" href={other.path}>
        Open {other.label}
      </Link>
    </div>
  );
}
