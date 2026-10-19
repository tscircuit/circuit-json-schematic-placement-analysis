import { Circuit } from "@tscircuit/core"
import { A_1N4148X_TP } from "./imports/A_1N4148X_TP"

// D4/D5 extracted from abse/boostxl-tlv8544pir v1.0.21, index.circuit.tsx.
// https://tscircuit.com/abse/boostxl-tlv8544pir?version=1.0.21#schematic
// Release a673baea-3c30-4dd5-a480-a4a4ac7e5fa0. Retain the imported symbols,
// pin mapping, connections, and published absolute positions (group offset -5.5).
// Other amplifier stages and PCB/CAD rendering are outside this two-diode repro.
export const pirDiodePlacements = {
  D4: [-2.2, 4.7, 0],
  D5: [-2.2, 2, 0],
} as const
export type PirDiodeLayout = Partial<
  Record<keyof typeof pirDiodePlacements, readonly [number, number, number]>
>

export async function createPirParallelDiodes(placements: PirDiodeLayout = {}) {
  const at = (name: keyof typeof pirDiodePlacements) => {
    const [schX, schY, schRotation] =
      placements[name] ?? pirDiodePlacements[name]
    return { name, schX, schY, schRotation }
  }
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schMaxTraceDistance={100}>
      <A_1N4148X_TP
        {...at("D4")}
        pcbX={11}
        pcbY={-13.5}
        connections={{ anode: "net.AINV", cathode: "net.AOUT" }}
      />
      <A_1N4148X_TP
        {...at("D5")}
        pcbX={11}
        pcbY={-11.5}
        pcbRotation={180}
        connections={{ anode: "net.AOUT", cathode: "net.AINV" }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
