import { CustomerDemoPlatformV3 } from "@/components/fruma/CustomerDemoPlatformV3";
import { FactoryCatalogueEnhancer } from "@/components/fruma/FactoryCatalogueEnhancer";
import "./enterprise-platform.css";
import "./interactive-platform.css";
import "./customer-demo.css";
import "./customer-demo-v2.css";
import "./customer-demo-v3.css";
import "./factory-catalogue.css";
import "../channel-lab/concept-sample.css";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <><CustomerDemoPlatformV3 /><FactoryCatalogueEnhancer /></>;
}
