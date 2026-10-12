import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMultiSheetComponentLabelOverlapCircuitJson } from "../assets/multi-sheet-component-label-overlap"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("renders both sheets without collision markers after core routes the connections directly", async () => {
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

  expect(collisionIssues).toEqual([])
  const sheets = circuitJson.filter(
    (element) => element.type === "schematic_sheet",
  )
  expect(sheets.map((sheet) => sheet.name)).toEqual(["Power", "Logic"])
  for (const sheet of sheets) {
    expect(
      analysis.getIssues({ schematicSheetId: sheet.schematic_sheet_id }),
    ).toEqual([])
  }
  const output = analysis.toString()
  expect(output).toBe("")

  const original = createSchematicAnalysisFixtureSvg({ circuitJson, analysis })
  const highlighted = createSchematicAnalysisFixtureSvg({
    circuitJson,
    analysis,
    highlightIssues: true,
  })
  const listing = (svg: string) =>
    svg
      .match(/<text[^>]*fill="#d00"[^>]*>[\s\S]*?<\/text>/)?.[0]
      .replaceAll('x="52"', 'x="18"')
  expect(original).toContain("UP1")
  expect(original).toContain("UL1")
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
    [...highlighted.matchAll(/data-listing-issue-number="(\d+)"/g)].map(
      (match) => Number(match[1]),
    ),
  ).toEqual([])
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
