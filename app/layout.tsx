import type { Metadata } from "next";
import { Archivo, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  axes: ["wdth"],
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fruma.ai"),
  title: {
    default: "Fruma",
    template: "%s — Fruma",
  },
  description:
    "Find factories through the products they can make—and see the evidence behind the match.",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://www.fruma.ai",
    siteName: "Fruma",
    title: "Fruma — Product origin, made visible",
    description:
      "Find factories through the products they can make—and see the evidence behind the match. A clearer starting point for your next collection.",
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
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
