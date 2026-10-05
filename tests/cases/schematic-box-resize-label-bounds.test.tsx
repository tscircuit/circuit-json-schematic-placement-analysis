import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { measureLabelBankGap } from "../fixtures/measure-label-bank-gap"

test("solves label clearance symmetrically for width and height at every corner", async () => {
  for (const variant of [
    { bank: "leftSide", end: "topSide", dimension: "height", snapshot: true },
    {
      bank: "leftSide",
      end: "bottomSide",
      dimension: "height",
      snapshot: false,
    },
    { bank: "rightSide", end: "topSide", dimension: "height", snapshot: false },
    {
      bank: "rightSide",
      end: "bottomSide",
      dimension: "height",
      snapshot: false,
    },
    { bank: "topSide", end: "leftSide", dimension: "width", snapshot: true },
    { bank: "topSide", end: "rightSide", dimension: "width", snapshot: false },
    {
      bank: "bottomSide",
      end: "leftSide",
      dimension: "width",
      snapshot: false,
    },
    {
      bank: "bottomSide",
      end: "rightSide",
      dimension: "width",
      snapshot: false,
    },
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
    // and a 0.2 gap between label banks determine the limiting dimension.
    expect(length).toBeCloseTo(3.44)
    const resized = await render(length!)
    const resizedAnalysis = analyzeSchematicPlacement(resized)
    expect(resizedAnalysis.getIssues()).toHaveLength(0)
    expect(measureLabelBankGap(resized) + 1e-9).toBeGreaterThanOrEqual(0.2)
    const tooSmall = await render(length! - 0.02)
    expect(
      analyzeSchematicPlacement(tooSmall).getIssues({
        issueTypes: ["SchematicBoxInnerLabelCollision"],
      }),
    ).toHaveLength(0)
    expect(measureLabelBankGap(tooSmall)).toBeLessThan(0.2)
    // Assert every mirrored corner; keep one visual example per resize axis.
    if (!variant.snapshot) continue
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
