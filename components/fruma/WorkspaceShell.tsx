"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Cpu,
  Database,
  FileText,
  KeyRound,
  Layers,
} from "lucide-react";

interface WorkspaceShellProps {
  children: React.ReactNode;
  activeVersion: "demo" | "test" | "production";
  activeOntology: string;
}

const NAV = [
  { href: "/deposits", label: "File Deposits", icon: FileText },
  { href: "/qualities", label: "Material Catalog", icon: Cpu },
  { href: "/grants", label: "Named Grants", icon: KeyRound },
] as const;

export function WorkspaceShell({
  children,
  activeVersion,
  activeOntology,
}: WorkspaceShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#0B0B0C] font-sans text-[#F5F5F7] antialiased md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-[#1F1F23] bg-[#121214] md:h-full md:w-64 md:border-b-0 md:border-r">
        <div className="flex h-14 shrink-0 items-center border-b border-[#1F1F23] px-6">
          <span className="select-none text-xs font-bold uppercase tracking-[0.45em] text-[#F5F5F7]">
            Fruma
          </span>
        </div>

        <nav
          className="flex flex-1 flex-wrap gap-1 overflow-x-auto p-3 md:block md:space-y-1 md:overflow-visible md:p-4"
          aria-label="Ledger Navigation"
        >
          <div className="mb-1 basis-full px-2 font-mono text-[10px] uppercase tracking-widest text-[#6E7E91] md:mb-2">
            Ledger Navigation
          </div>
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "group flex shrink-0 items-center gap-2.5 rounded-sm border border-[#1F1F23] bg-[#161619] px-3 py-2 font-mono text-xs text-[#F5F5F7]"
                    : "group flex shrink-0 items-center gap-2.5 rounded-sm px-3 py-2 font-mono text-xs text-[#6E7E91] transition-colors hover:bg-[#161619]/50 hover:text-[#F5F5F7]"
                }
              >
                <Icon
                  className={
                    active
                      ? "h-3.5 w-3.5 text-[#6E7E91]"
                      : "h-3.5 w-3.5 text-[#6E7E91] group-hover:text-[#F5F5F7]"
                  }
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1.5 border-t border-[#1F1F23] bg-[#0B0B0C] p-4 font-mono text-[10px] text-[#6E7E91]">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3 w-3 text-[#3B82F6]" />
            <span>
              Ontology:{" "}
              <strong className="font-normal text-[#F5F5F7]">{activeOntology}</strong>
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#1F1F23] bg-[#121214] px-4 py-3 md:h-14 md:flex-nowrap md:px-6 md:py-0">
          <div className="font-mono text-xs text-[#6E7E91]">
            Workspaces / <span className="text-[#F5F5F7]">Core Collection</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-sm border border-[#1F1F23] bg-[#161619] px-2.5 py-1 font-mono text-[10px]">
            <Database className="h-3.5 w-3.5 text-[#6E7E91]" />
            <span className="text-[#6E7E91]">search_path:</span>
            <span className="font-medium text-[#3B82F6]">fruma_{activeVersion}</span>
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 space-y-6 overflow-y-auto p-6 md:p-8">
          {activeVersion === "demo" && (
            <div className="flex w-full shrink-0 items-center gap-2 rounded-sm border border-amber-500/20 bg-amber-500/5 p-3 font-mono text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Sandbox context active. Operations write exclusively to the isolated local demo schema network.
              </span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
