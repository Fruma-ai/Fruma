import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { EnterForm } from "@/components/fruma/EnterForm";
import { Wordmark } from "@/components/fruma/Wordmark";

export const metadata: Metadata = {
  title: "Team login",
  description: "Private Fruma prototype. Owen, Chris and Sam only.",
  robots: { index: false, follow: false },
};

export default function EnterPage() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="app-chrome">
        <div className="app-chrome-inner">
          <Link href="/" aria-label="Fruma home">
            <Wordmark size="sm" />
          </Link>
          <span className="chrome-rule" aria-hidden />
          <span className="text-[12px] font-medium text-mute">Team only</span>
        </div>
      </header>
      <main className="mx-auto max-w-[560px] px-5 py-12 md:py-16">
        <p className="ui-label">Owen · Chris · Sam</p>
        <h1 className="page-title mt-2">Prototype login</h1>
        <p className="page-lede mt-3">
          The working build is under construction. Only the three of us sign
          in here. Brands, retailers and factories apply on the home page —
          we walk them through; they do not get a login.
        </p>
        <Suspense>
          <EnterForm />
        </Suspense>
        <p className="mt-8 text-[13px] text-mute">
          <Link href="/" className="font-medium text-ink underline-offset-2 hover:underline">
            Back to Fruma
          </Link>
        </p>
      </main>
    </div>
  );
}
