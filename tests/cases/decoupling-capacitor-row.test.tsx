import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("reports a spread-out capacitor row as one bank and accepts a compact row", async () => {
  // PR #41 incorrectly accepted the row at -6, -2, 2, 6 because each adjacent
  // pair was close. The review requires checking how far the entire bank spans.
  for (const [name, positions, count] of [
    ["spread-out", [-6, -2, 2, 6], 1],
    ["compact", [-2.1, -0.7, 0.7, 2.1], 0],
  ] as const) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board>
        <net name="VCC" isPowerNet />
        <net name="GND" isGroundNet />
        {positions.map((x, i) => (
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
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issueTypes = ["DecouplingCapacitorsNotCloseTogether"] as const
    const issues = analysis.getIssues({ issueTypes })
    expect(issues).toHaveLength(count)
    if (count === 1) {
      expect(issues[0]).toMatchObject({
        railName: "VCC",
        groundName: "GND",
        capacitorSchematicBoxes: [
          { sourceComponentName: "C1" },
          { sourceComponentName: "C2" },
          { sourceComponentName: "C3" },
          { sourceComponentName: "C4" },
        ],
      })
      expect(analysis.schematicIssuesToString(issues[0]!)).toContain(
        'capacitorNames="C1, C2, C3, C4"',
      )
    }
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        issueTypes,
        height: 450,
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
