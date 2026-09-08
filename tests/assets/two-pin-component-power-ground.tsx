import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createTwoPinPowerGroundCircuitJson({
  componentKind,
  rail,
  railPin,
}: {
  componentKind: "capacitor" | "resistor"
  rail: "ground" | "power"
  railPin: 1 | 2
}): Promise<CircuitJson> {
  const circuit = new Circuit()
  const componentName = componentKind === "capacitor" ? "C1" : "R1"
  const chipPin = railPin === 1 ? 2 : 1
  const componentY = rail === "ground" ? 2 : -2
  const rotation = (railPin === 2) === (rail === "ground") ? 270 : 90
  const componentProps = {
    name: componentName,
    footprint: "0603",
    schX: 0,
    schY: componentY,
    schRotation: rotation,
  }

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U1"
        footprint="soic8"
        schX={0}
        schY={-componentY}
        schPinArrangement={{
          [rail === "ground" ? "topSide" : "bottomSide"]: {
            pins: ["pin1"],
            direction: "left-to-right",
          },
          leftSide: { pins: ["pin2"], direction: "top-to-bottom" },
          rightSide: { pins: ["pin3"], direction: "top-to-bottom" },
        }}
      />
      {componentKind === "capacitor" ? (
        <capacitor {...componentProps} capacitance="1uF" />
      ) : (
        <resistor {...componentProps} resistance="10k" />
      )}
      <trace from={`.${componentName} > .pin${chipPin}`} to=".U1 > .pin1" />
      <trace
        from={`.${componentName} > .pin${railPin}`}
        to={rail === "ground" ? "net.GND" : "net.VCC"}
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
