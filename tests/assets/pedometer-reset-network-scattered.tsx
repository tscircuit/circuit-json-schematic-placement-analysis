import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

// Reduced from the 78-component pedometer's index.circuit.tsx.
// The scattered variant preserves U1/R8/C21/TP5 names, nets and schX/schY.
// U1 is reduced to RSTN; PCB, other MCU pins and unrelated networks are omitted.
export async function createPedometerResetNetworkCircuitJson(
  compact = false,
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={2}>
      <net name="V3" isPowerNet />
      <net name="GND" isGroundNet />
      <chip
        name="U1"
        schX={0}
        schY={0}
        pinLabels={{ pin1: "RSTN" }}
        schPinArrangement={{ rightSide: [1] }}
        connections={{ RSTN: "net.RESETN" }}
      />
      <resistor
        name="R8"
        resistance="100k"
        schX={compact ? 3 : -12}
        schY={compact ? 1.5 : -40}
        connections={{ pin1: "net.RESETN", pin2: "net.V3" }}
      />
      <capacitor
        name="C21"
        capacitance="100nF"
        schOrientation="vertical"
        schX={compact ? 3 : 0}
        schY={compact ? -1.5 : -28}
        connections={{ pin1: "net.RESETN", pin2: "net.GND" }}
      />
      <testpoint
        name="TP5"
        schX={compact ? 5 : 14}
        schY={compact ? 0 : -26.919}
        connections={{ pin1: "net.RESETN" }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
