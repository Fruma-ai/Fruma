import { CustomerDemoPlatformV2 } from "@/components/fruma/CustomerDemoPlatformV2";
import "./enterprise-platform.css";
import "./interactive-platform.css";
import "./customer-demo.css";
import "./customer-demo-v2.css";
import "../channel-lab/concept-sample.css";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <CustomerDemoPlatformV2 />;
}
