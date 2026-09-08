import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTextClearanceVariant } from "../assets/text-clearance-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("allows an intentional label inside its own component", async () => {
  const circuitJson = await createTextClearanceVariant("clear")
  const text = circuitJson.find(
    (e) => e.type === "schematic_text" && e.text === "U1",
  )
  if (text?.type !== "schematic_text")
    throw new Error("Missing reference label")
  // Circuit JSON also supports component-owned internal labels. Put this label
  // inside its owner without changing its ownership or any electrical objects.
  text.position = { x: -4.6, y: 0 }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    getPlacementIssues(analysis).filter(
      (e) => e.lineItemType === "SchematicTextCollision",
    ),
  ).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
