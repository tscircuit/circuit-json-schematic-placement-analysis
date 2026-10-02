import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"

// Re-render the screenshot's two 4.7k pull-ups with the recommended rotations.
// pin1 stays on its I2C signal; pin2 stays on the shared positive supply.
export async function createPdI2cPullUpsCircuitJson(
  rotation = 270,
  supplyPin: 1 | 2 = 2,
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board
      schLayout={{ layoutMode: "none" }}
      schTraceAutoLabelEnabled
      schMaxTraceDistance={2}
    >
      <net name="V3V3" isPowerNet />
      {(["SDA", "SCL"] as const).map((signal, i) => (
        <Fragment key={signal}>
          <resistor
            name={`R_PD_${signal}`}
            resistance="4.7k"
            schX={-3 + 4 * i}
            schY={-2}
            schRotation={rotation}
          />
          <trace
            name={`PD_${signal}`}
            from={`.R_PD_${signal} > .pin${supplyPin === 1 ? 2 : 1}`}
            to={`net.PD_${signal}`}
          />
          <trace
            name={`PULL_UP_${signal}`}
            from={`.R_PD_${signal} > .pin${supplyPin}`}
            to="net.V3V3"
          />
        </Fragment>
      ))}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
