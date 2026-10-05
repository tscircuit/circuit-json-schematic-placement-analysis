import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { createSchematicBoxSizingGenericCircuitJson } from "../assets/schematic-box-sizing-generic"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("keeps valid small width reductions under the existing label-gap threshold", async () => {
  const circuitJson = await createSchematicBoxSizingGenericCircuitJson(1.815)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getIssues()
    .filter((issue) => issue.lineItemType === "GenericSchematicBoxTooWide")
  expect(issues).toHaveLength(1)
  expect(issues[0]!.suggestedSchWidth).toBeCloseTo(1.765)
  const resized = await createSchematicBoxSizingGenericCircuitJson(
    issues[0]!.suggestedSchWidth,
  )
  const resizedAnalysis = analyzeSchematicPlacement(resized)
  expect(
    resizedAnalysis.getIssues({
      issueTypes: [
        "GenericSchematicBoxTooWide",
        "SchematicBoxInnerLabelCollision",
      ],
    }),
  ).toHaveLength(0)
  await expect(
    stackSvgsVertically(
      [
        createIssueReproSnapshot({
          circuitJson,
          analysis,
          width: 1200,
          height: 450,
          showFullSchematic: true,
          showOverlay: false,
        }),
        createIssueReproSnapshot({
          circuitJson: resized,
          analysis: resizedAnalysis,
          width: 1200,
          height: 450,
          showFullSchematic: true,
          showOverlay: false,
        }),
      ],
      { normalizeSize: false, gap: 0 },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
