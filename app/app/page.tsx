import { VersionBanner } from "@/components/fruma/VersionBanner";
import { CustomerDemoPlatformV3 } from "@/components/fruma/CustomerDemoPlatformV3";
import { FactoryCatalogueEnhancer } from "@/components/fruma/FactoryCatalogueEnhancer";
import "./enterprise-platform.css";
import "./interactive-platform.css";
import "./customer-demo.css";
import "./customer-demo-v2.css";
import "./customer-demo-v3.css";
import "./factory-catalogue.css";
import "./test-corpus.css";
import "../channel-lab/concept-sample.css";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * DEMO SURFACE — frozen customer story.
 * Do not wire Test corpus, Lab ingest, or experimental agents here.
 * Promote from /app/test only when explicitly requested.
 */
export default function AppPage() {
  return (
    <>
      <VersionBanner version="demo" />
      <CustomerDemoPlatformV3 />
      <FactoryCatalogueEnhancer />
    </>
  );
}
