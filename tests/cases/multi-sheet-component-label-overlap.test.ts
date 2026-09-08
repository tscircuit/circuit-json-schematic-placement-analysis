import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMultiSheetComponentLabelOverlapCircuitJson } from "../assets/multi-sheet-component-label-overlap"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("groups net-label collision issues and relevant boxes by sheet", async () => {
  const circuitJson = await createMultiSheetComponentLabelOverlapCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
  const collisionIssues = issues.filter(
    (issue) => issue.lineItemType === "NetLabelCollision",
  )

  expect(collisionIssues).toHaveLength(2)
  expect(collisionIssues.map((issue) => issue.schematicSheetName)).toEqual([
    "Power",
    "Logic",
  ])
  const output = analysis.toString()
  const powerSheetStart = output.indexOf('<SchematicSheet name="Power"')
  const logicSheetStart = output.indexOf('<SchematicSheet name="Logic"')
  expect(powerSheetStart).toBeGreaterThanOrEqual(0)
  expect(logicSheetStart).toBeGreaterThan(powerSheetStart)
  expect(output.slice(powerSheetStart, logicSheetStart)).not.toContain("UL")
  expect(output.slice(logicSheetStart)).not.toContain("UP")

  const original = createSchematicAnalysisFixtureSvg({ circuitJson, analysis })
  const highlighted = createSchematicAnalysisFixtureSvg({
    circuitJson,
    analysis,
    highlightIssues: true,
  })
  const listing = (svg: string) =>
    svg.match(/<text[^>]*fill="#d00"[^>]*>[\s\S]*?<\/text>/)?.[0]
  expect(listing(original)).toBeDefined()
  expect(listing(highlighted)).toBe(listing(original))
  const highlightedSheetIds = [
    ...highlighted.matchAll(
      /data-issue-number="\d+"[^>]*data-schematic-sheet-id="([^"]+)"/g,
    ),
  ].map((match) => match[1])
  expect(highlightedSheetIds).toEqual(
    collisionIssues.map((issue) => issue.schematicSheetId),
  )
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: [],
    }),
  ).toBe(original)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["SchematicTextCollision"],
    }),
  ).toBe(original)
  expect(analysis.toString()).toBe(output)
  expect(highlighted).toMatchSvgSnapshot(import.meta.path)
})
