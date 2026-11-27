import type { Metadata } from "next";
import FrumaHome from "@/src/fruma/pages/Home";

const title = "Fruma — Find your factory. Start with a sample.";
const description =
  "Fruma is being built for brands and designers to find manufacturing partners, assess their capabilities and reputation, and request samples before committing to production.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://www.fruma.ai",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Fruma exhibition stand with the purple F mark and brand marketplace concept.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.jpg"],
  },
};

export default function Page() {
  return <FrumaHome />;
}
