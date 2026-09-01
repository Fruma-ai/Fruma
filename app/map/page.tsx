import type { Metadata } from "next";
import { FeatureMap } from "@/components/fruma/FeatureMap";

export const metadata: Metadata = {
  title: "Feature & data map",
  description:
    "Where Fruma earns its keep — mapped against the fashion design and development process.",
};

export default function MapPage() {
  return <FeatureMap />;
}
