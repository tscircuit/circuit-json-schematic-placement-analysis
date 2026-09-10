import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { createElement } from "react"
import { analyzeSchematicPlacement } from "lib/index"
import { expectReproNets } from "../fixtures/placement-repro-assertions"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("keeps shared-rail decouplers in separate schematic groups and subcircuits independent", async () => {
  for (const scope of ["group", "subcircuit"] as const) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board>
        <net name="VCC" isPowerNet />
        <net name="GND" isGroundNet />
        {["A", "B"].map((name, i) =>
          createElement(
            scope,
            { key: name, name },
            <capacitor
              name={`C_${name}`}
              capacitance="100nF"
              schX={i * 15}
              schY={0}
              schRotation={270}
            />,
          ),
        )}
        <trace from=".A > .C_A > .pin1" to="net.VCC" />
        <trace from=".B > .C_B > .pin1" to="net.VCC" />
        <trace from=".A > .C_A > .pin2" to="net.GND" />
        <trace from=".B > .C_B > .pin2" to="net.GND" />
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    expectReproNets(circuitJson, [
      ["net.VCC", "C_A.pin1", "C_B.pin1"],
      ["net.GND", "C_A.pin2", "C_B.pin2"],
    ])
    const analysis = analyzeSchematicPlacement(circuitJson)
    expect(analysis.getIssueCounts().DecouplingCapacitorsNotCloseTogether).toBe(
      0,
    )
    expect(
      createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
    ).toMatchSvgSnapshot(
      import.meta.path,
      `decoupling-capacitor-${scope}-scope`,
    )
  }
})
