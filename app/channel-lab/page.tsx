import { ChannelReadinessLab } from "@/components/fruma/ChannelReadinessLab";
import "../app/enterprise-platform.css";
import "../app/interactive-platform.css";
import "../app/channel-readiness.css";

export const metadata = { robots: { index: false, follow: false } };

export default function ChannelLabPage() {
  return <div className="fx-shell"><ChannelReadinessLab /></div>;
}
