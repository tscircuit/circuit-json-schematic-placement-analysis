import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createPullResistorsWrongSideCircuitJson({
  pullUpY = -3,
  pullDownY = 3,
  resistorRotation = 90,
  declarePulls = true,
  declareRails = true,
  sharedSignal = false,
  pullUpResistance = "10k",
  shuntCapacitor = false,
}: {
  pullUpY?: number
  pullDownY?: number
  resistorRotation?: number
  declarePulls?: boolean
  declareRails?: boolean
  sharedSignal?: boolean
  pullUpResistance?: string
  shuntCapacitor?: boolean
} = {}): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="VCC" isPowerNet={declareRails} />
      <net name="GND" isGroundNet={declareRails} />
      <chip
        name="U1"
        schX={0}
        schY={0}
        pinLabels={{ pin1: "RESET_N", pin2: "BOOT" }}
        pinAttributes={{
          RESET_N: { needsExternalPullup: declarePulls },
          BOOT: { needsExternalPulldown: declarePulls },
        }}
        schPinArrangement={{
          leftSide: { pins: ["pin1", "pin2"], direction: "top-to-bottom" },
        }}
      />
      {/* The defaults put both resistors on the opposite side of their signal. */}
      <resistor
        name="R1"
        resistance={pullUpResistance}
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
      {sharedSignal && (
        <>
          <chip
            name="U2"
            schX={-8}
            schY={0}
            pinLabels={{ pin1: "RESET_N" }}
            pinAttributes={{ RESET_N: { needsExternalPullup: true } }}
          />
          <trace from=".U2 > .RESET_N" to=".U1 > .RESET_N" />
        </>
      )}
      {shuntCapacitor && (
        <>
          <capacitor
            name="C1"
            capacitance="100nF"
            schX={-5}
            schY={-1}
            schRotation={90}
          />
          <trace from=".C1 > .pin1" to=".U1 > .RESET_N" />
          <trace from=".C1 > .pin2" to="net.GND" />
        </>
      )}
      <trace from=".U1 > .RESET_N" to=".R1 > .pin2" />
      <trace from=".R1 > .pin1" to="net.VCC" />
      <trace from=".U1 > .BOOT" to=".R2 > .pin1" />
      <trace from=".R2 > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
