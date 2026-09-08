import { expect } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { analyzeSchematicPlacement } from "lib/index"
import type { realSchematics } from "../assets/real-schematics"
import { createSchematicAnalysisFixtureSvg } from "./create-schematic-analysis-fixture-svg"
import {
  createSchematicReview,
  getReviewSheets,
  type IssueType,
} from "./schematic-review"

export async function expectRealSchematicReview(input: {
  fixture: (typeof realSchematics)[number]
  testPath: string
  expectedCounts: Partial<Record<IssueType, number>>
  selectedType: IssueType
  selectedSheetId: string
  expectedSheetViews: number
}) {
  const { fixture, selectedType, selectedSheetId } = input
  const { circuitJson, provenance } = fixture
  const original = JSON.stringify(circuitJson)
  const bytes = readFileSync(
    new URL(`../assets/real-schematics/${provenance.id}.json`, import.meta.url),
  )
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    provenance.fixtureSha256,
  )
  expect(circuitJson).toHaveLength(provenance.fixtureElementCount)
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(provenance.schematicComponentCount)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const review = createSchematicReview({
    circuitJson,
    analysis,
    sheetId: selectedSheetId,
    issueTypes: [selectedType],
  })
  // Freeze emitted counts, not a claim that these findings are confirmed defects.
  expect(
    Object.fromEntries(
      Object.entries(review.counts).filter(([, count]) => count),
    ),
  ).toEqual(input.expectedCounts)
  expect(review.visibleIssues.length).toBeGreaterThan(0)
  expect(review.allIssues.every((entry) => entry.shapes.length > 0)).toBe(true)

  const sheets = getReviewSheets(circuitJson)
  expect(sheets).toHaveLength(input.expectedSheetViews)
  let visibleCount = 0
  for (const sheet of sheets) {
    const fullSheet = createSchematicReview({
      circuitJson,
      analysis,
      sheetId: sheet.id,
    })
    expect(
      fullSheet.visibleIssues.every((entry) => entry.sheetId === sheet.id),
    ).toBe(true)
    expect(
      fullSheet.circuitSvg.match(/data-issue-number=/g) ?? [],
    ).toHaveLength(fullSheet.visibleIssues.length)
    expect(fullSheet.circuitSvg).not.toMatch(/(?:NaN|Infinity)/)
    const badgePositions = [
      ...fullSheet.circuitSvg.matchAll(
        /<circle cx="([^"]+)" cy="([^"]+)" r="[^"]+" fill="#b91c1c"/g,
      ),
    ].map((match) => `${match[1]},${match[2]}`)
    expect(new Set(badgePositions).size).toBe(fullSheet.visibleIssues.length)
    expect(fullSheet.counts).toEqual(review.counts)
    visibleCount += fullSheet.visibleIssues.length
  }
  expect(visibleCount).toBe(review.allIssues.length)

  const selected = review.visibleIssues[0]!
  const focused = createSchematicReview({
    circuitJson,
    analysis,
    sheetId: selectedSheetId,
    issueTypes: [selectedType],
    issueNumber: selected.number,
    zoomToIssue: true,
  })
  expect(focused.visibleIssues.map((entry) => entry.number)).toEqual([
    selected.number,
  ])
  expect(focused.circuitSvg.match(/data-issue-number=/g)).toHaveLength(1)
  expect(focused.circuitSvg).toContain(`data-issue-type="${selectedType}"`)
  expect(focused.counts).toEqual(review.counts)
  const empty = createSchematicReview({
    circuitJson,
    analysis,
    sheetId: selectedSheetId,
    issueTypes: [],
  })
  expect(empty.visibleIssues).toEqual([])
  expect(empty.circuitSvg).not.toContain("data-issue-number=")
  expect(empty.counts).toEqual(review.counts)
  expect(empty.text).toContain("Matching issues shown: 0")

  await expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      height: 700,
      review: {
        sheetId: selectedSheetId,
        issueTypes: [selectedType],
        issueNumber: selected.number,
        zoomToIssue: true,
      },
    }),
  ).toMatchSvgSnapshot(input.testPath)
  expect(JSON.stringify(circuitJson)).toBe(original)
  return focused
}
