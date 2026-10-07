import { WorkspaceShell } from "@/components/fruma/WorkspaceShell";

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell activeVersion="demo" activeOntology="Retail/Apparel">
      {children}
    </WorkspaceShell>
  );
}
