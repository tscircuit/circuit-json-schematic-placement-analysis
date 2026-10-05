import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("does not suggest shrinking BLDC symbols into inner pin-label collisions", async () => {
  for (const name of ["U5", "U7", "U8", "U9", "J5"] as const) {
    const circuitJson = await renderBldcSymbol(name)
    const analysis = analyzeSchematicPlacement(circuitJson)
    expect(
      analysis
        .getIssues()
        .filter(
          (issue) => issue.lineItemType === "SchematicBoxInnerLabelCollision",
        ),
    ).toHaveLength(0)
    const issues = analysis
      .getIssues()
      .filter(
        (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      )
    expect(issues).toHaveLength(0)
    await expect(
      createIssueReproSnapshot({
        width: 1200,
        showFullSchematic: true,
        showOverlay: false,
        showListingIssueMarkers: true,
        circuitJson,
        analysis,
        height: 550,
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
