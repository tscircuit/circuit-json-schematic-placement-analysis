import { Fragment } from "react"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createRepeatedCircuitInconsistentCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      {[0, 1, 2].map((index) => {
        const y = 4 - index * 4
        const resistor = `R${index + 1}`
        const capacitor = `C${index + 1}`
        return (
          <Fragment key={index}>
            <net name={`GND${index + 1}`} isGroundNet />
            <resistor name={resistor} resistance="1k" schX={-3} schY={y} />
            <capacitor
              name={capacitor}
              capacitance="100nF"
              schX={index === 2 ? 5 : 0}
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
