import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("uses supply-pin metadata and does not infer rails from signal pin names", async () => {
  for (const hasSupplyMetadata of [true, false]) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board>
        <chip
          name="U1"
          schX={0}
          schY={0}
          pinLabels={{ pin1: "SUPPLY", pin2: "RETURN" }}
          pinAttributes={{
            SUPPLY: { providesPower: hasSupplyMetadata },
            RETURN: { providesGround: hasSupplyMetadata },
          }}
        />
        {[-8, 8].map((x, i) => (
          <capacitor
            key={i}
            name={`C${i + 1}`}
            capacitance="100nF"
            schX={x}
            schY={3}
            schRotation={270}
            connections={{ pin1: ".U1 > .SUPPLY", pin2: ".U1 > .RETURN" }}
          />
        ))}
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    expect(
      circuitJson.filter(
        (e) => e.type === "source_net" && (e.is_power || e.is_ground),
      ),
    ).toHaveLength(0)
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issues = analysis.getIssues({
      issueTypes: ["DecouplingCapacitorsNotCloseTogether"],
    })
    expect(issues).toHaveLength(hasSupplyMetadata ? 1 : 0)
    if (hasSupplyMetadata)
      expect(issues[0]).toMatchObject({
        railName: "SUPPLY",
        groundName: "RETURN",
      })
    expect(
      createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
    ).toMatchSvgSnapshot(
      import.meta.path,
      hasSupplyMetadata ? "supplies" : "signals",
    )
  }
})
