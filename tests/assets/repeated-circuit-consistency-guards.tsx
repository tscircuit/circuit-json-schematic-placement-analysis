import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { Fragment } from "react"

export async function createRepeatedCircuitGuardCircuitJson(
  variant: "consistent" | "two-channels" | "distinct-values",
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const indices = variant === "two-channels" ? [0, 1] : [0, 1, 2]
  const resistances =
    variant === "distinct-values" ? ["1k", "10k", "47k"] : ["1k", "1k", "1k"]

  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      {indices.map((index) => {
        const y = 4 - index * 4
        const resistor = `R${index + 1}`
        const capacitor = `C${index + 1}`
        const capX =
          variant === "consistent" ? 0 : index === indices.length - 1 ? 5 : 0
        return (
          <Fragment key={index}>
            <net name={`GND${index + 1}`} isGroundNet />
            <resistor
              name={resistor}
              resistance={resistances[index]!}
              schX={-3}
              schY={y}
            />
            <capacitor
              name={capacitor}
              capacitance="100nF"
              schX={capX}
              schY={y - 1.5}
              schOrientation="vertical"
            />
            <trace from={`.${resistor} > .pin1`} to={`net.IN${index + 1}`} />
            <trace from={`.${resistor} > .pin2`} to={`.${capacitor} > .pin1`} />
            <trace from={`.${resistor} > .pin2`} to={`net.OUT${index + 1}`} />
            <trace from={`.${capacitor} > .pin2`} to={`net.GND${index + 1}`} />
          </Fragment>
        )
      })}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
