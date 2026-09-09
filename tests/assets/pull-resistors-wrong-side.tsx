import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createPullResistorsWrongSideCircuitJson({
  pullUpY = -3,
  pullDownY = 3,
  resistorRotation = 90,
  declarePullRequirements = true,
}: {
  pullUpY?: number
  pullDownY?: number
  resistorRotation?: number
  declarePullRequirements?: boolean
} = {}): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="VCC" isPowerNet />
      <net name="GND" isGroundNet />
      <chip
        name="U1"
        schX={0}
        schY={0}
        pinLabels={{ pin1: "RESET_N", pin2: "BOOT" }}
        pinAttributes={{
          RESET_N: { needsExternalPullup: declarePullRequirements },
          BOOT: { needsExternalPulldown: declarePullRequirements },
        }}
        schPinArrangement={{
          leftSide: { pins: ["pin1", "pin2"], direction: "top-to-bottom" },
        }}
      />
      {/* The defaults put both resistors on the opposite side of their signal. */}
      <resistor
        name="R1"
        resistance="10k"
        schX={-3}
        schY={pullUpY}
        schRotation={resistorRotation}
      />
      <resistor
        name="R2"
        resistance="10k"
        schX={-6}
        schY={pullDownY}
        schRotation={resistorRotation}
      />
      <trace from=".U1 > .RESET_N" to=".R1 > .pin2" />
      <trace from=".R1 > .pin1" to="net.VCC" />
      <trace from=".U1 > .BOOT" to=".R2 > .pin1" />
      <trace from=".R2 > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
