"use client";

import { Columns3, Globe, Search, Shirt, Warehouse } from "lucide-react";
import { rangeSummary } from "@/lib/fruma/range";
import type { BrandRoom } from "@/lib/fruma/types";
import { ModeSwitch } from "./ModeSwitch";
import { SeedBanner } from "./SeedBanner";
import { Wordmark } from "./Wordmark";
import { useFruma } from "./store";

const ROOMS: { id: BrandRoom; label: string; icon: typeof Search }[] = [
  { id: "design", label: "Design", icon: Search },
  { id: "desk", label: "Desk", icon: Columns3 },
  { id: "product", label: "Product", icon: Shirt },
  { id: "feeds", label: "Listings", icon: Globe },
  { id: "suppliers", label: "Suppliers", icon: Warehouse },
];

export function BrandShell({ children }: { children: React.ReactNode }) {
  const { brandRoom, setBrandRoom, deskIds, chosenId } = useFruma();
  const dense = brandRoom === "feeds" || brandRoom === "suppliers";
  return (
    <div data-mode="brand" className="min-h-dvh bg-paper text-ink">
      <header className="app-chrome">
        <div className="app-chrome-inner">
          <button type="button" className="shrink-0" aria-label="Fruma studio">
            <Wordmark size="sm" />
          </button>
          <span className="chrome-rule" aria-hidden />
          <nav className="room-seg" aria-label="Studio rooms">
            {ROOMS.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setBrandRoom(r.id)}
                  aria-current={brandRoom === r.id ? "page" : undefined}
                  className="room-tab"
                >
                  <Icon size={14} strokeWidth={1.75} aria-hidden />
                  {r.label}
                  {r.id === "desk" && deskIds.length > 0 ? (
                    <span className="count">{deskIds.length}</span>
                  ) : null}
                  {r.id === "product" && chosenId ? (
                    <span className="count">1</span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          <div className="chrome-status">
            <span>Sunspel · unaffiliated</span>
            <span className="spec text-[11px]">{rangeSummary().styles} styles in</span>
          </div>
          <ModeSwitch />
        </div>
      </header>
      <SeedBanner />
      <main
        className={
          dense
            ? "room-fade mx-auto max-w-[1440px] px-4 pb-20 pt-6 md:px-5 md:pt-7"
            : "room-fade mx-auto max-w-[1280px] px-4 pb-24 pt-8 md:px-8 md:pt-10"
        }
      >
        {children}
      </main>
    </div>
  );
}
