import { InteractivePlatform } from "@/components/fruma/InteractivePlatform";
import "./enterprise-platform.css";
import "./interactive-platform.css";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <InteractivePlatform />;
}
