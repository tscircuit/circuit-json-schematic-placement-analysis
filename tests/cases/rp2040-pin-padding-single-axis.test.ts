import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { renderRp2040InputSymbol } from "../assets/rp2040-bldc-controller/input-symbols"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { measureLabelBankGap } from "../fixtures/measure-label-bank-gap"

test("retains safe single-axis suggestions when a joint shrink collides at a corner", async () => {
  for (const variant of [
    { name: "J_PD", width: undefined, axis: "height" },
    { name: "U_PD", width: undefined, axis: "height" },
    { name: "J_PD", width: 8, axis: "width" },
  ] as const) {
    const circuitJson = await renderRp2040InputSymbol(variant.name, {
      width: variant.width,
    })
    const unchanged = JSON.stringify(circuitJson)
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issues = analysis
      .getIssues()
      .filter(
        (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      )
    expect(issues).toHaveLength(1)
    const issue = issues[0]!
    expect(issue.message).toEndWith(variant.axis)
    const width = issue.suggestedSchWidth
    const height = issue.suggestedSchHeight
    // Each alternative must be checked separately; combining them is unsafe.
    if (variant.axis === "height") {
      expect(width).toBeUndefined()
      expect(height).toBeLessThan(issue.schematicBox.height)
      expect(
        issue.paddingDetails!.every(
          (detail) => detail.pinSide === "left" || detail.pinSide === "right",
        ),
      ).toBe(true)
    } else {
      expect(height).toBeUndefined()
      expect(width).toBeLessThan(issue.schematicBox.width)
      expect(
        issue.paddingDetails!.every(
          (detail) => detail.pinSide === "top" || detail.pinSide === "bottom",
        ),
      ).toBe(true)
    }
    expect(JSON.stringify(circuitJson)).toBe(unchanged)
    const resized = await renderRp2040InputSymbol(variant.name, {
      width: width ?? issue.schematicBox.width,
      height: height ?? issue.schematicBox.height,
    })
    const resizedAnalysis = analyzeSchematicPlacement(resized)
    expect(measureLabelBankGap(resized) + 1e-9).toBeGreaterThanOrEqual(0.2)
    expect(
      resizedAnalysis
        .getIssues()
        .filter(
          (finding) =>
            finding.lineItemType === "SchematicBoxInnerLabelCollision",
        ),
    ).toHaveLength(0)
    // A safe single-axis resize can leave a useful reduction on the other
    // axis. Apply that suggestion too instead of asserting a false zero count.
    const remaining = resizedAnalysis
      .getIssues()
      .filter(
        (finding) =>
          finding.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      )
    expect(remaining).toHaveLength(1)
    const followup = remaining[0]!
    if (variant.axis === "height") {
      expect(followup.suggestedSchHeight).toBeUndefined()
      expect(followup.suggestedSchWidth).toBeDefined()
    } else {
      expect(followup.suggestedSchWidth).toBeUndefined()
      expect(followup.suggestedSchHeight).toBeDefined()
    }
    const compact = await renderRp2040InputSymbol(variant.name, {
      width: followup.suggestedSchWidth ?? width ?? issue.schematicBox.width,
      height:
        followup.suggestedSchHeight ?? height ?? issue.schematicBox.height,
    })
    const compactAnalysis = analyzeSchematicPlacement(compact)
    expect(compactAnalysis.getIssues()).toHaveLength(0)
    expect(measureLabelBankGap(compact) + 1e-9).toBeGreaterThanOrEqual(0.2)
    if (variant.axis === "width") {
      expect(
        resizedAnalysis.getIssues({
          issueTypes: ["GenericSchematicBoxTooWide"],
        }),
      ).toHaveLength(0)
    }
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
      } else {
        expect(Math.abs(port.center.x - component.center.x)).toBeLessThan(
          component.size.width / 2,
        )
      }
    }
    await expect(
      stackSvgsVertically(
        [
          createIssueReproSnapshot({
            circuitJson,
            analysis,
            width: 1200,
            height: 550,
            showFullSchematic: true,
            showOverlay: false,
          }),
          createIssueReproSnapshot({
            circuitJson: resized,
            analysis: resizedAnalysis,
            width: 1200,
            height: 550,
            showFullSchematic: true,
            showOverlay: false,
          }),
          createIssueReproSnapshot({
            circuitJson: compact,
            analysis: compactAnalysis,
            width: 1200,
            height: 550,
            showFullSchematic: true,
            showOverlay: false,
          }),
        ],
        { normalizeSize: false, gap: 0 },
      ),
    ).toMatchSvgSnapshot(import.meta.path, `${variant.name}-${variant.axis}`)
  }
})
