import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("still shrinks an oversized unequal-bank symbol to dimensions that render safely", async () => {
  const circuitJson = await renderBldcSymbol("U3", { schHeight: 5 })
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
    )
  expect(issues).toHaveLength(1)
  const height = issues[0]!.suggestedSchHeight!
  expect(height).toBeGreaterThanOrEqual(1.6)
  expect(height).toBeLessThan(5)
  const resized = await renderBldcSymbol("U3", { schHeight: height })
  const resizedAnalysis = analyzeSchematicPlacement(resized)
  expect(
    resizedAnalysis
      .getIssues()
      .filter(
        (issue) =>
          issue.lineItemType === "SchematicBoxInnerLabelCollision" ||
          issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      ),
  ).toHaveLength(0)
  const component = resized.find(
    (element) => element.type === "schematic_component",
  )!
  for (const port of resized) {
    if (port.type !== "schematic_port") continue
    if (
      port.side_of_component === "left" ||
      port.side_of_component === "right"
    ) {
      expect(Math.abs(port.center.y - component.center.y)).toBeLessThan(
        component.size.height / 2,
      )
    }
  }
  await expect(
    stackSvgsVertically(
      [
        createIssueReproSnapshot({
          width: 1200,
          showFullSchematic: true,
          showOverlay: false,
          showListingIssueMarkers: true,
          circuitJson,
          analysis,
          height: 450,
        }),
        createIssueReproSnapshot({
          width: 1200,
          showFullSchematic: true,
          showOverlay: false,
          showListingIssueMarkers: true,
          circuitJson: resized,
          analysis: resizedAnalysis,
          height: 450,
        }),
      ],
      { normalizeSize: false, gap: 0 },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
