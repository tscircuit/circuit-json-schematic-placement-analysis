import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { components } from "./components"
import { usbCPinLabels } from "./usb-pin-labels"

export type BldcSymbol = keyof typeof components | "J1"

export async function renderBldcSymbol(
  name: BldcSymbol,
  dimensions: { schWidth?: number; schHeight?: number } = {},
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board routingDisabled>
      {name === "J1" ? (
        // Native USB-C symbol used by both J1 and J19 on the real board.
        <connector
          name="J1"
          standard="usb_c"
          pinLabels={usbCPinLabels}
          {...dimensions}
        />
      ) : (
        <chip
          {...components[name]}
          schWidth={dimensions.schWidth ?? components[name].schWidth}
          schHeight={dimensions.schHeight ?? components[name].schHeight}
        />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
