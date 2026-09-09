import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("accepts compact decouplers and reports spacing just beyond the body-gap limit", async () => {
  // The installed vertical capacitor is 0.53 units wide: 4.53 center spacing
  // leaves exactly the four-unit recommended gap between its bounds.
  for (const [name, spacing, count] of [
    ["compact", 2, 0],
    ["boundary", 4.53, 0],
    ["beyond-boundary", 4.54, 1],
  ] as const) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board>
        <net name="VCC" isPowerNet />
        <net name="GND" isGroundNet />
        {[0, spacing].map((x, i) => (
          <capacitor
            key={i}
            name={`C${i + 1}`}
            capacitance="100nF"
            schX={x}
            schY={0}
            schRotation={270}
            connections={{ pin1: "net.VCC", pin2: "net.GND" }}
          />
        ))}
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    const before = JSON.stringify(circuitJson)
    const analysis = analyzeSchematicPlacement(circuitJson)
    expect(
      analysis.getIssues({
        issueTypes: ["DecouplingCapacitorsNotCloseTogether"],
      }),
    ).toHaveLength(count)
    expect(JSON.stringify(circuitJson)).toBe(before)
    expect(
      createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
    ).toMatchSvgSnapshot(import.meta.path, `decoupling-capacitors-${name}`)
  }
})
