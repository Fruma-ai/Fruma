import type { Metadata } from "next";
import FrumaHome from "@/src/fruma/pages/Home";

export const metadata: Metadata = {
  title: "Fruma — Product origin, made visible",
  description:
    "Find factories through the products they can make—and see the evidence behind the match. A clearer starting point for your next collection.",
};

export default function Page() {
  return <FrumaHome />;
}
