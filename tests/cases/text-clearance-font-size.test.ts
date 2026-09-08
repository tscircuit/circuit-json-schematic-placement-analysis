import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createWireTextCollisionCircuitJson } from "../assets/wire-text-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("uses font size rather than a fixed text clearance box", async () => {
  const circuitJson = await createWireTextCollisionCircuitJson()
  const text = circuitJson.find(
    (e) => e.type === "schematic_text" && e.text === "ANALOG INPUT",
  )
  if (text?.type !== "schematic_text") throw new Error("Missing annotation")
  text.font_size = 0.12
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
