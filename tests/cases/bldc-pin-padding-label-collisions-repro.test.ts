import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces BLDC padding suggestions that introduce inner pin-label collisions", async () => {
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
    expect(issues).toHaveLength(1)
    const issue = issues[0]!
    // Apply the actual recommendation by rendering TSX again, not by rewriting JSON.
    const resized = await renderBldcSymbol(name, {
      schWidth: issue.suggestedSchWidth,
      schHeight: issue.suggestedSchHeight,
    })
    const resizedAnalysis = analyzeSchematicPlacement(resized)
    expect(
      resizedAnalysis
        .getIssues()
        .filter(
          (finding) =>
            finding.lineItemType === "SchematicBoxInnerLabelCollision",
        ),
    ).toHaveLength(1)
    await expect(
      stackSvgsVertically(
        [
          createSchematicAnalysisFixtureSvg({
            circuitJson,
            analysis,
            height: 550,
          }),
          createSchematicAnalysisFixtureSvg({
            circuitJson: resized,
            analysis: resizedAnalysis,
            height: 550,
          }),
        ],
        { normalizeSize: false, gap: 0 },
      ),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
