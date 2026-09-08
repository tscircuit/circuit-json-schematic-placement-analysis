import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTextClearanceExportControl } from "../assets/text-clearance-export-controls"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("does not flag identical labels, em whitespace, or empty custom-symbol corners", async () => {
  for (const customSymbol of [false, true]) {
    const circuitJson = await createTextClearanceExportControl(customSymbol)
    const analysis = analyzeSchematicPlacement(circuitJson)
    expect(
      getPlacementIssues(analysis).filter(
        (e) => e.lineItemType === "SchematicTextCollision",
      ),
    ).toEqual([])
    expect(
      createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
    ).toMatchSvgSnapshot(import.meta.path, customSymbol ? "custom" : undefined)
  }
})
