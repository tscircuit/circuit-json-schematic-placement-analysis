import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

// Reduced from the Macro 6 USB-C board export. The original F1 is a 500 mA,
// 6 V resettable fuse drawn horizontally between the VBUS and FUSED_5V rails.
export async function createMacroSixSeriesFuseCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false}>
      <net name="VBUS" isPowerNet />
      <net name="FUSED_5V" isPowerNet />
      <fuse
        name="F1"
        currentRating="500mA"
        voltageRating="6V"
        manufacturerPartNumber="nSMD050"
        supplierPartNumbers={{ jlcpcb: ["C69688"] }}
        schX={-8.75}
        schY={4.2}
      />
      <trace from="net.VBUS" to=".F1 > .pin1" />
      <trace from=".F1 > .pin2" to="net.FUSED_5V" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
