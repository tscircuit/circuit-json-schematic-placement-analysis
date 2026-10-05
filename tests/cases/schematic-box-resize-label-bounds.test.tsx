import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("solves label clearance symmetrically for width and height at every corner", async () => {
  for (const variant of [
    { bank: "leftSide", end: "topSide", dimension: "height" },
    { bank: "leftSide", end: "bottomSide", dimension: "height" },
    { bank: "rightSide", end: "topSide", dimension: "height" },
    { bank: "rightSide", end: "bottomSide", dimension: "height" },
    { bank: "topSide", end: "leftSide", dimension: "width" },
    { bank: "topSide", end: "rightSide", dimension: "width" },
    { bank: "bottomSide", end: "leftSide", dimension: "width" },
    { bank: "bottomSide", end: "rightSide", dimension: "width" },
  ] as const) {
    const render = async (length: number) => {
      const circuit = new Circuit()
      circuit.pcbDisabled = true
      circuit.add(
        <board routingDisabled>
          <chip
            name="U1"
            schX={4}
            schY={-3}
            schWidth={variant.dimension === "width" ? length : 0.8}
            schHeight={variant.dimension === "height" ? length : 0.8}
            schPinSpacing={0.2}
            pinLabels={{
              pin1: "AA",
              pin2: "AA",
              pin3: "AA",
              pin4: "AA",
              pin5: "LONG_SIGNAL",
              pin6: "LONG_SIGNAL",
            }}
            schPinArrangement={{
              [variant.bank]: [1, 2, 3, 4],
              [variant.end]: [5, 6],
            }}
          />
        </board>,
      )
      await circuit.renderUntilSettled()
      return circuit.getCircuitJson()
    }
    const circuitJson = await render(5.5)
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issues = analysis
      .getIssues()
      .filter(
        (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      )
    expect(issues).toHaveLength(1)
    const length =
      variant.dimension === "height"
        ? issues[0]!.suggestedSchHeight
        : issues[0]!.suggestedSchWidth
    // 11-character label, edge padding, outer bank pin, half text height,
    // and the shared 0.02 label clearance determine the limiting dimension.
    expect(length).toBeCloseTo(3.08)
    const resized = await render(length!)
    const resizedAnalysis = analyzeSchematicPlacement(resized)
    expect(resizedAnalysis.getIssues()).toHaveLength(0)
    const tooSmall = await render(length! - 0.02)
    expect(
      analyzeSchematicPlacement(tooSmall).getIssues({
        issueTypes: ["SchematicBoxInnerLabelCollision"],
      }),
    ).toHaveLength(1)
    await expect(
      stackSvgsVertically(
        [
          createIssueReproSnapshot({
            circuitJson,
            analysis,
            width: 1000,
            height: 450,
            showFullSchematic: true,
            showOverlay: false,
          }),
          createIssueReproSnapshot({
            circuitJson: resized,
            analysis: resizedAnalysis,
            width: 1000,
            height: 450,
            showFullSchematic: true,
            showOverlay: false,
          }),
        ],
        { normalizeSize: false, gap: 0 },
      ),
    ).toMatchSvgSnapshot(import.meta.path, `${variant.bank}-${variant.end}`)
  }
})
