import { Suspense } from "react";
import { TestCorpusPlatform } from "@/components/fruma/TestCorpusPlatform";
import "../customer-demo.css";
import "../test-corpus.css";

export const metadata = {
  title: "Fruma test corpus",
  description: "Three dummy brands and fifty factories with private hanger datasets.",
  robots: { index: false, follow: false },
};

export default function TestCorpusPage() {
  return (
    <Suspense fallback={<div className="tc-shell" />}>
      <TestCorpusPlatform />
    </Suspense>
  );
}
