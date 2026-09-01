"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const TabsCtx = React.createContext<{
  value: string;
  setValue: (v: string) => void;
} | null>(null);

function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const value = controlled ?? uncontrolled;
  const setValue = (v: string) => {
    setUncontrolled(v);
    onValueChange?.(v);
  };
  return (
    <TabsCtx.Provider value={{ value, setValue }}>
      <div data-slot="tabs" className={cn("flex flex-col gap-0", className)}>
        {children}
      </div>
    </TabsCtx.Provider>
  );
}

function TabsList({
  className,
  children,
  variant,
}: {
  className?: string;
  children: React.ReactNode;
  variant?: "default" | "line";
}) {
  return (
    <div
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "inline-flex w-fit items-center gap-0 border-b border-line",
        className,
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsCtx);
  const selected = ctx?.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-slot="tabs-trigger"
      className={cn(
        "-mb-px h-9 px-3 text-[13px] font-medium tracking-[-0.015em] text-mute hover:text-foreground",
        selected && "border-b-[1.5px] border-foreground text-foreground",
        className,
      )}
      onClick={() => ctx?.setValue(value)}
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsCtx);
  if (ctx?.value !== value) return null;
  return (
    <div data-slot="tabs-content" className={cn("pt-5", className)} role="tabpanel">
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
