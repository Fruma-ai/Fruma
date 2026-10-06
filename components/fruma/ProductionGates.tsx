import { assessApparelGates, type CaseSignals, type GateStatus } from "@/lib/fruma/gates";

const STATUS_LABEL: Record<GateStatus, string> = {
  waiting: "Waiting",
  ready: "From the data",
  gap: "Needs an answer",
  physical: "Factory floor",
};

export function ProductionGates({ signals }: { signals: CaseSignals }) {
  const gates = assessApparelGates(signals);
  return (
    <section className="cd-card cd-gates" data-testid="production-gates">
      <p className="cd-eyebrow">Making the garment</p>
      <h2>What the mill file can clear</h2>
      <p className="cd-muted">
        The same nine stages a factory already runs. Fruma uses cloth data to clear the information gates.
        Cutting, sewing, fit, and shipping stay on the floor.
      </p>
      {gates.map((gate) => (
        <div key={gate.id} className={`cd-gate ${gate.status}`} data-gate={gate.id} data-status={gate.status}>
          <span>{String(gate.stage).padStart(2, "0")}</span>
          <div>
            <b>{gate.title}</b>
            <small>{gate.detail}</small>
          </div>
          <span className="cd-gate-status">{STATUS_LABEL[gate.status]}</span>
        </div>
      ))}
    </section>
  );
}
