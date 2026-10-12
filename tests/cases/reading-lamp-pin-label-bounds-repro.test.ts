import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createReadingLampPinLabelBoundsCircuitJson } from "../assets/reading-lamp-pin-label-bounds"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces reading-lamp pin labels crossing their chip's top and bottom edges", async () => {
  const circuitJson = await createReadingLampPinLabelBoundsCircuitJson()
  const components = circuitJson.filter((e) => e.type === "schematic_component")
  const ports = circuitJson.filter((e) => e.type === "schematic_port")
  expect(components).toHaveLength(1)
  expect(ports).toHaveLength(24)
  const box = components[0]!
  expect(box.size).toEqual({ width: 2, height: 2.2 })
  const endPins = ports.filter((p) => [1, 12, 13, 24].includes(p.pin_number!))
  expect(endPins.map((p) => p.display_pin_label).sort()).toEqual([
    "GND1",
    "GND2",
    "VCCA",
    "VCCB2",
  ])
  for (const port of endPins) {
    // The label is centered on the edge, so half its 0.15-unit height escapes.
    expect(Math.abs(port.center.y - box.center.y)).toBeCloseTo(
      box.size.height / 2,
    )
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toHaveLength(1)
  const issue = analysis.getIssues()[0]!
  if (issue.lineItemType !== "SchematicBoxInnerLabelOutOfBounds")
    throw Error("Missing label containment diagnostic")
  expect(
    issue.overflowingLabels.map((label) => [label.text, label.outsideEdges]),
  ).toEqual([
    ["VCCA", ["top"]],
    ["GND1", ["bottom"]],
    ["GND2", ["bottom"]],
    ["VCCB2", ["top"]],
  ])
  expect(issue.suggestedSchHeight).toBe(2.55)
  expect(issue.suggestedSchWidth).toBeUndefined()
  expect(analysis.getIssueCounts().SchematicBoxInnerLabelOutOfBounds).toBe(1)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
