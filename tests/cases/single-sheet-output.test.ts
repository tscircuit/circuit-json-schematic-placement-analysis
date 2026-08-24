import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSingleSheetOverlapCircuitJson } from "../assets/single-sheet-overlap"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not wrap output when the circuit has only one sheet", async () => {
  const circuitJson = await createSingleSheetOverlapCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const output = analysis.toString()

  expect(output).toContain("<SchematicBoxPositions>")
  expect(output).toContain("<SchematicPlacementIssues>")
  expect(output).not.toContain("<SchematicSheet")
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
