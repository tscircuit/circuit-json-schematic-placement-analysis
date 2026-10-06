import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { expectReproNets } from "../fixtures/placement-repro-assertions"

test("records capacitor bank warnings for tidy BLDC charger rows and separated clusters", async () => {
  for (const [variant, rail, first, positions] of [
    // Native BLDC charger banks: 1.2 and 1.1 units between adjacent symbol bodies.
    ["pmid-row", "CHG_PMID", 23, [-3.15, -1.05, 1.05, 3.15]],
    ["sys-row", "CHG_SYS", 30, [-5, -3, -1, 1, 3, 5]],
    // Every capacitor has a nearby neighbor, but the bank has a large gap between pairs.
    ["separated-clusters", "SUPPLY", 1, [-8, -6, 6, 8]],
  ] as const) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board>
        <net name={rail} isPowerNet />
        <net name="GND" isGroundNet />
        {positions.map((x, i) => (
          <capacitor
            key={i}
            name={`C${first + i}`}
            capacitance={i === positions.length - 1 ? "100nF" : "10uF"}
            schX={x}
            schY={0}
            schRotation={270}
            connections={{ pin1: `net.${rail}`, pin2: "net.GND" }}
          />
        ))}
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    const names = positions.map((_, i) => `C${first + i}`)
    expectReproNets(circuitJson, [
      [`net.${rail}`, ...names.map((name) => `${name}.pin1`)],
      ["net.GND", ...names.map((name) => `${name}.pin2`)],
    ])
    const issueTypes = ["DecouplingCapacitorsNotCloseTogether"] as const
    const analysis = analyzeSchematicPlacement(circuitJson, { issueTypes })
    // Baseline uses the farthest pair, incorrectly warning on both tidy rows too.
    expect(analysis.getIssues()).toHaveLength(1)
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        issueTypes,
        showFullSchematic: true,
        width: 1200,
        height: 400,
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant)
  }
})
