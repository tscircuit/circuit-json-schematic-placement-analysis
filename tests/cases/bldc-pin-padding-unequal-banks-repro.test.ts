import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
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
    expect(issues).toHaveLength(name === "U1" ? 1 : 0)
    expect(JSON.stringify(circuitJson)).toBe(original)
    const snapshots = [
      createIssueReproSnapshot({
        width: 1200,
        showFullSchematic: true,
        showOverlay: false,
        showListingIssueMarkers: true,
        circuitJson,
        analysis,
        height: 550,
      }),
    ]
    if (issues.length) {
      const resized = await renderBldcSymbol(name, {
        schWidth: issues[0]!.suggestedSchWidth,
        schHeight: issues[0]!.suggestedSchHeight,
      })
      const resizedAnalysis = analyzeSchematicPlacement(resized)
      expect(resizedAnalysis.getIssues()).toHaveLength(0)
      const component = resized.find(
        (element) => element.type === "schematic_component",
      )!
      for (const pin of resized) {
        if (pin.type !== "schematic_port") continue
        const verticalEdge =
          pin.side_of_component === "left" || pin.side_of_component === "right"
        const clearance = verticalEdge
          ? component.size.height / 2 -
            Math.abs(pin.center.y - component.center.y)
          : component.size.width / 2 -
            Math.abs(pin.center.x - component.center.x)
        expect(clearance + 1e-9).toBeGreaterThanOrEqual(component.pin_spacing!)
      }
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
