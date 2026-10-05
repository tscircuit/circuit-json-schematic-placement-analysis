import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { renderRp2040InputSymbol } from "../assets/rp2040-bldc-controller/input-symbols"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("checks corner labels after a height reduction while retaining safe width suggestions", async () => {
  for (const name of ["J_PD", "U_PD"] as const) {
    const original = await renderRp2040InputSymbol(name)
    const padding = analyzeSchematicPlacement(original)
      .getIssues()
      .find(
        (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      )!
    expect(padding.suggestedSchHeight).toBeDefined()
    const circuitJson = await renderRp2040InputSymbol(name, {
      height: padding.suggestedSchHeight,
    })
    const analysis = analyzeSchematicPlacement(circuitJson)
    const widthIssues = analysis
      .getIssues()
      .filter((issue) => issue.lineItemType === "GenericSchematicBoxTooWide")
    // Both symbols can shrink in width, but corner labels may require a wider
    // result than the label-gap estimate alone would suggest.
    expect(widthIssues).toHaveLength(1)
    const snapshots = [
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        width: 1200,
        height: 550,
        showFullSchematic: true,
        showOverlay: false,
      }),
    ]
    if (widthIssues.length) {
      const resized = await renderRp2040InputSymbol(name, {
        height: padding.suggestedSchHeight,
        width: widthIssues[0]!.suggestedSchWidth,
      })
      const resizedAnalysis = analyzeSchematicPlacement(resized)
      expect(resizedAnalysis.getIssues()).toHaveLength(0)
      snapshots.push(
        createIssueReproSnapshot({
          circuitJson: resized,
          analysis: resizedAnalysis,
          width: 1200,
          height: 550,
          showFullSchematic: true,
          showOverlay: false,
        }),
      )
    }
    await expect(
      stackSvgsVertically(snapshots, { normalizeSize: false, gap: 0 }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
