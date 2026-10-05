import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { renderRp2040InputSymbol } from "../assets/rp2040-bldc-controller/input-symbols"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("width suggestions preserve every pin bank and stop at the required width", async () => {
  const circuitJson = await renderRp2040InputSymbol("J_PD", { width: 8 })
  const unchanged = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getIssues()
    .filter((issue) => issue.lineItemType === "GenericSchematicBoxTooWide")
  expect(issues).toHaveLength(1)
  const issue = issues[0]!
  const component = circuitJson.find(
    (element) => element.type === "schematic_component",
  )!
  const horizontalPins = circuitJson
    .filter((element) => element.type === "schematic_port")
    .filter(
      (element) =>
        element.side_of_component === "top" ||
        element.side_of_component === "bottom",
    )
  const minimumWidth =
    2 *
    Math.max(
      ...horizontalPins.map(
        (pin) =>
          Math.abs(pin.center.x - component.center.x) + component.pin_spacing!,
      ),
    )
  expect(issue.suggestedSchWidth).toBeCloseTo(minimumWidth)
  expect(issue.suggestedSchWidth).toBeLessThan(component.size.width)
  expect(JSON.stringify(circuitJson)).toBe(unchanged)

  const resized = await renderRp2040InputSymbol("J_PD", {
    width: issue.suggestedSchWidth,
  })
  const resizedAnalysis = analyzeSchematicPlacement(resized)
  expect(resizedAnalysis.getIssues()).toHaveLength(0)
  const resizedComponent = resized.find(
    (element) => element.type === "schematic_component",
  )!
  for (const pin of resized) {
    if (pin.type !== "schematic_port") continue
    const verticalEdge =
      pin.side_of_component === "left" || pin.side_of_component === "right"
    const clearance = verticalEdge
      ? resizedComponent.size.height / 2 -
        Math.abs(pin.center.y - resizedComponent.center.y)
      : resizedComponent.size.width / 2 -
        Math.abs(pin.center.x - resizedComponent.center.x)
    expect(clearance + 1e-9).toBeGreaterThanOrEqual(
      resizedComponent.pin_spacing!,
    )
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
      ],
      { normalizeSize: false, gap: 0 },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
