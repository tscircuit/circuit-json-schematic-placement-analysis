import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"

export async function createCellSenseFilterLadder({
  grouped = false,
  cellCount = 3,
  lowestCellToGround = false,
  groundedVc0 = false,
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const numbers = Array.from({ length: cellCount + 1 }, (_, i) => i)
  const inputNumbers = Array.from({ length: cellCount + 3 }, (_, i) => i)
  const filtered = (i: number) =>
    groundedVc0 && i === 0 ? "GND" : `FILTER_${i}`
  const passiveNumbers = numbers.filter((i) => i !== 0 || !groundedVc0)
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={3}>
      <chip
        name="U1"
        pinLabels={Object.fromEntries([
          ...inputNumbers.map((i) => [`pin${i + 1}`, `VC${i}`]),
          [`pin${inputNumbers.length + 1}`, "VSS"],
        ])}
        schPinArrangement={{
          leftSide: {
            pins: inputNumbers.map((i) => `VC${i}`).reverse(),
            direction: "top-to-bottom",
          },
          rightSide: { pins: ["VSS"], direction: "top-to-bottom" },
        }}
        schX={5}
        schY={10}
      />
      {inputNumbers.map((i) => (
        <Fragment key={`input-${i}`}>
          <trace
            name={`T_INPUT_${i}`}
            from={`.U1 > .VC${i}`}
            to={`net.${filtered(Math.min(i, cellCount))}`}
          />
        </Fragment>
      ))}
      <trace name="T_GROUND" from=".U1 > .VSS" to="net.GND" />
      {passiveNumbers.map((i) => (
        <Fragment key={`R${i}`}>
          <resistor
            name={`R${i}`}
            resistance="33"
            schX={grouped ? -4 : 4 * i}
            schY={grouped ? 2 * i : 0}
            schRotation={grouped && i > 0 ? 0 : 90}
          />
          <trace
            name={`T_R${i}_RAW`}
            from={`.R${i} > .pin1`}
            to={`net.${i === 0 ? "GND" : `CELL_${i}`}`}
          />
          <trace
            name={`T_R${i}_FILTER`}
            from={`.R${i} > .pin2`}
            to={`net.${filtered(i)}`}
          />
        </Fragment>
      ))}
      {passiveNumbers.map((i) => (
        <Fragment key={`C${i}`}>
          <capacitor
            name={`C${i}`}
            capacitance="1uF"
            schX={grouped ? -1 : 4 * i - 12}
            schY={grouped ? 2 * i - 1 : -3}
            schRotation={-90}
          />
          <trace
            name={`T_C${i}_UPPER`}
            from={`.C${i} > .pin1`}
            to={`net.${filtered(i)}`}
          />
          <trace
            name={`T_C${i}_LOWER`}
            from={`.C${i} > .pin2`}
            to={`net.${i === 0 || (i === 1 && lowestCellToGround) ? "GND" : filtered(i - 1)}`}
          />
        </Fragment>
      ))}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
