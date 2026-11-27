import type { Metadata } from "next";
import FrumaHome from "@/src/fruma/pages/Home";

export const metadata: Metadata = {
  title: "Fruma — Product origin, made visible",
  description:
    "Find factories through the products they can make—and see the evidence behind the match. A clearer starting point for your next collection.",
  openGraph: {
    title: "Fruma — Product origin, made visible",
    description:
      "Find factories through the products they can make—and see the evidence behind the match. A clearer starting point for your next collection.",
    url: "https://www.fruma.ai",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Fruma exhibition stand with the purple F mark and the line Product origin, made visible.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fruma — Product origin, made visible",
    description:
      "Find factories through the products they can make—and see the evidence behind the match.",
    images: ["/og.jpg"],
  },
};

export default function Page() {
  return <FrumaHome />;
}
