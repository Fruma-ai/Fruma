import { FrumaDemoPlatform } from "@/components/fruma/FrumaDemoPlatform";
import "./enterprise-platform.css";
import "./interactive-platform.css";
import "./customer-demo.css";
import "../channel-lab/concept-sample.css";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <FrumaDemoPlatform />;
}
