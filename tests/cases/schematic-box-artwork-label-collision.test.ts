import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicBoxInnerLabelCollisionCircuitJson } from "../assets/schematic-box-inner-label-collision"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("owned artwork does not disable existing label collision checks", async () => {
  const circuitJson = await createSchematicBoxInnerLabelCollisionCircuitJson({
    schWidth: 1.25,
    schHeight: 4,
  })
  const component = circuitJson.find(
    (element) => element.type === "schematic_component",
  )!
  circuitJson.push({
    type: "schematic_circle",
    schematic_circle_id: "owned_artwork",
    schematic_component_id: component.schematic_component_id,
    center: { x: component.center.x, y: component.center.y + 1.5 },
    radius: 0.1,
    stroke_width: 0.02,
    color: "#800000",
    is_filled: false,
    is_dashed: false,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({ issueTypes: ["SchematicBoxInnerLabelCollision"] }),
  ).toHaveLength(1)
  await expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1200,
      height: 550,
      showFullSchematic: true,
      showOverlay: false,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
