import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createStaggeredChipLabelsCircuitJson } from "../assets/staggered-chip-labels"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces missed staggered chip labels on opposing sides", async () => {
  for (const vertical of [false, true]) {
    const circuitJson = await createStaggeredChipLabelsCircuitJson({ vertical })
    const originalJson = JSON.stringify(circuitJson)
    const ports = circuitJson.filter(
      (element) => element.type === "schematic_port",
    )
    expect(ports).toHaveLength(3)
    expect(ports.map((port) => port.display_pin_label).sort()).toEqual([
      "COMMON",
      "THROW1",
      "THROW2",
    ])
    const coordinates = ports
      .map((port) => (vertical ? port.center.x : port.center.y))
      .sort()
    expect(coordinates[0]).toBeCloseTo(-0.1)
    expect(coordinates[1]).toBeCloseTo(0)
    expect(coordinates[2]).toBeCloseTo(0.1)
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["SchematicBoxInnerLabelCollision"],
    })
    expect(analysis.getIssues()).toHaveLength(1)
    expect(analysis.getIssues()[0]).toMatchObject({
      lineItemType: "SchematicBoxInnerLabelCollision",
      schematicBox: { sourceComponentName: "SW3" },
      overlappingSides: vertical ? ["top", "bottom"] : ["left", "right"],
      message: `Inner labels are colliding. Increase the ${vertical ? "schHeight" : "schWidth"}.`,
    })
    expect(
      analyzeSchematicPlacement(circuitJson).getIssueCounts()
        .SchematicBoxInnerLabelCollision,
    ).toBe(1)
    expect(JSON.stringify(circuitJson)).toBe(originalJson)
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson,
        analysis,
        highlightIssues: ["SchematicBoxInnerLabelCollision"],
      }),
    ).toMatchSvgSnapshot(
      import.meta.path,
      vertical ? "top-bottom" : "left-right",
    )
  }
})
