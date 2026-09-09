import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { parseSync } from "svgson"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports one bank regardless of pin order and excludes other rails, returns, and signal capacitors", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <net name="VCC" isPowerNet />
      <net name="VDD" isPowerNet />
      <net name="GND" isGroundNet />
      <net name="AGND" isGroundNet />
      {(
        [
          ["C1", 0, 4, "VCC", "GND"],
          ["C2", 10, 4, "GND", "VCC"],
          ["C3", 20, 4, "VCC", "GND"],
          ["C4", 10, 0, "VDD", "GND"],
          ["C5", 0, 0, "VCC", "AGND"],
          ["C6", 20, 0, "SIGNAL", "GND"],
          ["C7", 30, 0, "SIGNAL", "GND"],
          ["C8", 20, -4, "VCC", "SIGNAL"],
          ["C9", 30, -4, "VCC", "SIGNAL"],
        ] as const
      ).map(([name, x, y, first, second]) => (
        <capacitor
          key={name}
          name={name}
          capacitance="100nF"
          schX={x}
          schY={y}
          schRotation={270}
          connections={{ pin1: `net.${first}`, pin2: `net.${second}` }}
        />
      ))}
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: ["DecouplingCapacitorsNotCloseTogether"],
  })
  expect(issues).toHaveLength(1)
  const issue = issues[0]!
  if (issue.lineItemType !== "DecouplingCapacitorsNotCloseTogether")
    throw new Error("Expected grouping issue")
  expect(
    issue.capacitorSchematicBoxes.map((box) => box.sourceComponentName),
  ).toEqual(["C1", "C2", "C3"])
  expect(issue).not.toHaveProperty("firstCapacitorSchematicBox")
  expect(issue).not.toHaveProperty("secondCapacitorSchematicBox")
  const xml = analysis.schematicIssuesToString(issue)
  expect(xml).toContain('capacitorNames="C1, C2, C3"')
  expect(xml).not.toContain("firstCapacitorName")
  expect(xml).not.toContain("secondCapacitorName")
  expect(issue.railName).toBe("VCC")
  expect(issue.groundName).toBe("GND")
  // New diagnostic attributes must use the same XML escaping as other issues.
  const escaped = analysis.schematicIssuesToString({
    ...issue,
    railName: 'VCC & "A" <1>',
  })
  expect(parseSync(`<svg>${escaped}</svg>`).children[0]!.attributes.rail).toBe(
    "VCC &amp; &quot;A&quot; &lt;1&gt;",
  )
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["DecouplingCapacitorsNotCloseTogether"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
