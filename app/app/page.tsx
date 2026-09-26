import { VersionBanner } from "@/components/fruma/VersionBanner";
import { CustomerDemoPlatformV3 } from "@/components/fruma/CustomerDemoPlatformV3";
import "./enterprise-platform.css";
import "./interactive-platform.css";
import "./customer-demo.css";
import "./customer-demo-v2.css";
import "./customer-demo-v3.css";
import "./test-corpus.css";
import "../channel-lab/concept-sample.css";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * DEMO SURFACE — promoted spine from Test.
 * Source / Confirm / Standardise + Factory Setup run the real wedge
 * (workbook → map → cited shortlist → anon confirm → locked truth).
 * Fake FactoryCatalogueEnhancer removed. Fifty-factory corpus stays on Test.
 */
export default function AppPage() {
  return (
    <>
      <VersionBanner version="demo" />
      <CustomerDemoPlatformV3 />
    </>
  );
}
