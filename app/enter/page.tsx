import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { EnterForm } from "@/components/fruma/EnterForm";
import { PublicBar } from "@/components/fruma/PublicBar";

export const metadata: Metadata = {
  title: "Platform login",
  description: "Sign in to the Fruma platform.",
  robots: { index: false, follow: false },
};

export default function EnterPage() {
  return (
    <div className="min-h-dvh bg-black text-white" data-mode="mill">
      <PublicBar active="platform" />
      <main className="mx-auto max-w-[560px] px-5 py-16 md:px-10 md:py-24">
        <p className="manifest-stack">
          <span>Platform</span>
        </p>
        <span className="manifest-rule" />
        <p className="max-w-[36ch] text-[14px] leading-relaxed text-white/50">
          Sign in with your Fruma email. Brands, retailers and factories apply
          on the home page — that lands in Owen’s inbox, not a login.
        </p>
        <Suspense>
          <EnterForm />
        </Suspense>
        <p className="mt-10">
          <Link href="/" className="manifest-nav">
            Back
          </Link>
        </p>
      </main>
    </div>
  );
}
