import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("does not shrink BLDC symbols below the space needed by all pin banks", async () => {
  for (const name of ["U1", "U3"] as const) {
    const circuitJson = await renderBldcSymbol(name)
    const original = JSON.stringify(circuitJson)
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issues = analysis
      .getIssues()
      .filter(
        (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      )
    expect(issues).toHaveLength(0)
    expect(JSON.stringify(circuitJson)).toBe(original)
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
