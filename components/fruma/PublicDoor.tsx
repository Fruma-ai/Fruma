import { InterestForm } from "@/components/fruma/InterestForm";
import { PublicBar } from "@/components/fruma/PublicBar";
import { DOORS, type DoorRole } from "@/lib/fruma/doors";

/**
 * Door pages share the public lockup: black cloth, PublicBar, Archivo stack,
 * tracked FRUMA, mark off the header. Not a new visual system.
 */
export function PublicDoor({ role }: { role: DoorRole }) {
  const door = DOORS[role];
  return (
    <div className="min-h-dvh bg-black text-white" data-mode="mill">
      <PublicBar active="apply" />
      <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-16 md:px-10 md:pt-20">
        <p className="manifest-stack">
          <span>{door.stack}</span>
        </p>
        <span className="manifest-rule" />
        <h1 className="max-w-[42ch] text-[18px] font-medium leading-snug tracking-[-0.03em] text-white/80 md:text-[22px]">
          {door.copy}
        </h1>
        <div className="mt-12 max-w-[420px]">
          <InterestForm presetKind={door.kind} />
        </div>
      </main>
    </div>
  );
}
