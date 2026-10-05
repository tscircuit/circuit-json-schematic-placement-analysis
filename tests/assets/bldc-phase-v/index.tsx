import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

// Real Phase V excerpt from rp2040-bldc-motor-controller-new, 5 October 2026:
// circuit/motor.tsx, circuit/schematic-layout.json and circuit/schematic-notes.tsx.
// Inline schAt's resolved coordinates for the two real gate-resistor branches
// and supply bypass capacitor; retain values, nets, rotations and grouping box.
// The MOSFETs are unnecessary for the annotation/placement bug and are omitted.
// Render this excerpt on the default sheet; the pinned core does not attach
// sheet IDs to annotation boxes. Omit the other phases and PCB routing.
export async function createBldcPhaseVGroupingBoxCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={3}>
      <schematicbox
        schX={-1}
        schY={3.7}
        width={9.8}
        height={11.5}
        title="Phase V half bridge"
        titleFontSize={0.28}
        titleInside
        strokeStyle="dashed"
      />
      <net name="VMOTOR" isPowerNet />
      <net name="GND" isGroundNet />
      <resistor
        name="R94"
        resistance="10"
        footprint="0603"
        schX={-4}
        schY={6}
        schRotation={0}
        connections={{ pin1: "net.GHB", pin2: "net.GHB_GATE" }}
      />
      <resistor
        name="R95"
        resistance="100k"
        footprint="0603"
        schX={-2.2}
        schY={5.58}
        schRotation={-90}
        connections={{ pin1: "net.GHB_GATE", pin2: "net.PHASE_V" }}
      />
      <resistor
        name="R96"
        resistance="10"
        footprint="0603"
        schX={-4}
        schY={1}
        schRotation={0}
        connections={{ pin1: "net.GLB", pin2: "net.GLB_GATE" }}
      />
      <resistor
        name="R97"
        resistance="100k"
        footprint="0603"
        schX={-2.2}
        schY={0.58}
        schRotation={-90}
        connections={{ pin1: "net.GLB_GATE", pin2: "net.LS_RETURN" }}
      />
      <capacitor
        name="C91"
        capacitance="1uF"
        maxVoltageRating={50}
        footprint="0805"
        schX={2}
        schY={7.5}
        schRotation={-90}
        connections={{ pin1: "net.VMOTOR", pin2: "net.GND" }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
