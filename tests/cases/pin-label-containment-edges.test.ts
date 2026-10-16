import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPinLabelContainmentCircuitJson } from "../assets/pin-label-containment"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("detects end labels on all four pin banks and accepts the suggested dimensions", async () => {
  for (const side of ["left", "right", "top", "bottom"] as const) {
    const horizontal = side === "left" || side === "right"
    const options = {
      side,
      width: horizontal ? 2 : 0.2,
      height: horizontal ? 0.2 : 2,
      x: 3,
      y: -4,
    }
    const circuitJson = await createPinLabelContainmentCircuitJson(options)
    const original = JSON.stringify(circuitJson)
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["SchematicBoxInnerLabelOutOfBounds"],
    })
    expect(JSON.stringify(circuitJson)).toBe(original)
    expect(analysis.getIssues()).toHaveLength(1)
    const issue = analysis.getIssues()[0]!
    if (issue.lineItemType !== "SchematicBoxInnerLabelOutOfBounds")
      throw Error()
    expect(issue.overflowingLabels).toHaveLength(2)
    expect(
      issue.overflowingLabels.flatMap((label) => label.outsideEdges).sort(),
    ).toEqual(horizontal ? ["bottom", "top"] : ["left", "right"])
    expect(
      horizontal ? issue.suggestedSchHeight : issue.suggestedSchWidth,
    ).toBe(0.55)
    const fixed = await createPinLabelContainmentCircuitJson({
      ...options,
      width: issue.suggestedSchWidth ?? options.width,
      height: issue.suggestedSchHeight ?? options.height,
    })
    const fixedAnalysis = analyzeSchematicPlacement(fixed, {
      issueTypes: ["SchematicBoxInnerLabelOutOfBounds"],
    })
    expect(fixedAnalysis.getIssues()).toEqual([])
    for (const [stage, json, result] of [
      ["before", circuitJson, analysis],
      ["after", fixed, fixedAnalysis],
    ] as const) {
      expect(
        createSchematicAnalysisFixtureSvg({
          circuitJson: json,
          analysis: result,
          highlightIssues: true,
        }),
      ).toMatchSvgSnapshot(import.meta.path, `${side}-${stage}`)
    }
  }
})
