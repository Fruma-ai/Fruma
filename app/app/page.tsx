import { PlatformV2 } from "@/components/fruma/PlatformV2";
import "./platform-v2.css";
import "./platform-data.css";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <PlatformV2 />;
}
