import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPinLabelContainmentCircuitJson } from "../assets/pin-label-containment"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("detects a lone label crossing the opposite box edge without a colliding label", async () => {
  const opposite = {
    left: "right",
    right: "left",
    top: "bottom",
    bottom: "top",
  } as const
  for (const side of ["left", "right", "top", "bottom"] as const) {
    const horizontal = side === "left" || side === "right"
    const options = {
      side,
      width: horizontal ? 0.4 : 2,
      height: horizontal ? 2 : 0.4,
      labels: ["LONG_LABEL"],
    }
    const circuitJson = await createPinLabelContainmentCircuitJson(options)
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: [
        "SchematicBoxInnerLabelOutOfBounds",
        "SchematicBoxInnerLabelCollision",
      ],
    })
    expect(analysis.getIssues()).toHaveLength(1)
    const issue = analysis.getIssues()[0]!
    if (issue.lineItemType !== "SchematicBoxInnerLabelOutOfBounds")
      throw Error()
    expect(issue.overflowingLabels).toHaveLength(1)
    expect(issue.overflowingLabels[0]!.outsideEdges).toEqual([opposite[side]])
    const fixed = await createPinLabelContainmentCircuitJson({
      ...options,
      width: issue.suggestedSchWidth ?? options.width,
      height: issue.suggestedSchHeight ?? options.height,
    })
    expect(
      analyzeSchematicPlacement(fixed, {
        issueTypes: ["SchematicBoxInnerLabelOutOfBounds"],
      }).getIssues(),
    ).toEqual([])
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson,
        analysis,
        highlightIssues: true,
      }),
    ).toMatchSvgSnapshot(import.meta.path, side)
  }
})
