import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { renderRp2040InputSymbol } from "../assets/rp2040-bldc-controller/input-symbols"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("retains a height warning with a safe label-limited reduction", async () => {
  const circuitJson = await renderRp2040InputSymbol("J_PD", { width: 1.4 })
  const unchanged = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
    )
  expect(issues).toHaveLength(1)
  const issue = issues[0]!
  expect(issue.suggestedSchWidth).toBeUndefined()
  expect(issue.suggestedSchHeight).toBeGreaterThan(2.455)
  expect(issue.suggestedSchHeight).toBeLessThanOrEqual(2.8)
  expect(issue.message).toEndWith("height")
  expect(JSON.stringify(circuitJson)).toBe(unchanged)

  const resized = await renderRp2040InputSymbol("J_PD", {
    width: 1.4,
    height: issue.suggestedSchHeight,
  })
  const resizedAnalysis = analyzeSchematicPlacement(resized)
  expect(resizedAnalysis.getIssues()).toHaveLength(0)
  const component = resized.find(
    (element) => element.type === "schematic_component",
  )!
  for (const port of resized) {
    if (port.type !== "schematic_port") continue
    const verticalEdge =
      port.side_of_component === "left" || port.side_of_component === "right"
    const clearance = verticalEdge
      ? component.size.height / 2 - Math.abs(port.center.y - component.center.y)
      : component.size.width / 2 - Math.abs(port.center.x - component.center.x)
    expect(clearance + 1e-9).toBeGreaterThanOrEqual(component.pin_spacing!)
  }
  // The limiting constraint really is label clearance: reducing the proposed
  // height by a fraction of a pin spacing creates the original corner overlap.
  const tooShort = await renderRp2040InputSymbol("J_PD", {
    width: 1.4,
    height: issue.suggestedSchHeight! - component.pin_spacing! / 10,
  })
  expect(
    analyzeSchematicPlacement(tooShort).getIssues({
      issueTypes: ["SchematicBoxInnerLabelCollision"],
    }),
  ).toHaveLength(1)
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
      ],
      { normalizeSize: false, gap: 0 },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
