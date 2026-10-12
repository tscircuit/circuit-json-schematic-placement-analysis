import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createNearTouchingPinLabelsCircuitJson } from "../assets/near-touching-pin-labels"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { measureLabelBankGap } from "../fixtures/measure-label-bank-gap"

test("reports near-touching staggered pin labels and suggests a padded size on their axis", async () => {
  for (const vertical of [false, true]) {
    // SOURCE + DRAIN glyph widths total 1.0425; body-edge insets total 0.2.
    // A 1.3-unit body leaves 0.0575 between the text bounds, without overlap.
    for (const dimension of [1, 1.1, 1.2, 1.3, 1.3424, 1.3425, 1.4]) {
      const circuitJson = await createNearTouchingPinLabelsCircuitJson({
        vertical,
        dimension,
      })
      const original = JSON.stringify(circuitJson)
      const analysis = analyzeSchematicPlacement(circuitJson, {
        issueTypes: ["SchematicBoxInnerLabelCollision"],
      })
      const issues = analysis.getIssues({
        issueTypes: ["SchematicBoxInnerLabelCollision"],
      })
      expect(JSON.stringify(circuitJson)).toBe(original)
      if (dimension >= 1.3425) {
        expect(issues).toHaveLength(0)
        continue
      }
      expect(issues).toHaveLength(1)
      const issue = issues[0]!
      if (issue.lineItemType !== "SchematicBoxInnerLabelCollision")
        throw Error()
      expect(issue.overlappingSides).toEqual(
        vertical ? ["top", "bottom"] : ["left", "right"],
      )
      expect(issue.minimumLabelGap).toBe(0.1)
      expect(issue.labelPairs).toHaveLength(dimension <= 1.1 ? 2 : 1)
      const sourcePair = issue.labelPairs!.find(
        (pair) => pair.firstLabel.text === "SOURCE",
      )!
      expect(sourcePair).toMatchObject({
        firstLabel: { text: "SOURCE" },
        secondLabel: { text: "DRAIN" },
        kind: dimension <= 1.2 ? "overlap" : "clearance",
      })
      const sides = vertical ? ["top", "bottom"] : ["left", "right"]
      expect(issue.message).toContain(
        `Labels SOURCE (${sides[0]}) and DRAIN (${sides[1]}) ${dimension <= 1.2 ? "overlap" : "are too close"}.`,
      )
      if (dimension === 1 || dimension === 1.2)
        expect(issue.message).not.toContain("are too close")
      if (dimension === 1.1)
        expect(issue.message).toContain(
          `Labels GATE (${sides[0]}) and DRAIN (${sides[1]}) are too close.`,
        )
      if (dimension > 1.2) expect(issue.message).not.toContain(" overlap.")
      expect(
        vertical ? issue.suggestedSchHeight : issue.suggestedSchWidth,
      ).toBe(1.343)
      expect(
        vertical ? issue.suggestedSchWidth : issue.suggestedSchHeight,
      ).toBe(undefined)
      expect(analysis.toString()).toContain('minimumLabelGap="0.1"')
      expect(analysis.toString()).toContain(
        `${vertical ? "suggestedSchHeight" : "suggestedSchWidth"}="1.343"`,
      )
      const resized = await createNearTouchingPinLabelsCircuitJson({
        vertical,
        dimension: 1.343,
      })
      const resizedAnalysis = analyzeSchematicPlacement(resized, {
        issueTypes: ["SchematicBoxInnerLabelCollision"],
      })
      expect(resizedAnalysis.getIssues()).toHaveLength(0)
      expect(measureLabelBankGap(resized)).toBeGreaterThanOrEqual(0.1)
      if (dimension !== 1.3) continue
      expect(sourcePair.measuredGap).toBeCloseTo(0.0575)
      expect(measureLabelBankGap(circuitJson)).toBeCloseTo(0.0575)
      for (const [stage, json, result] of [
        ["before", circuitJson, analysis],
        ["after", resized, resizedAnalysis],
      ] as const) {
        const svg = createSchematicAnalysisFixtureSvg({
          circuitJson: json,
          analysis: result,
          highlightIssues: ["SchematicBoxInnerLabelCollision"],
        })
        if (stage === "before") {
          expect(
            svg.match(/class="pin-label-collision-highlight"/g),
          ).toHaveLength(2)
          expect(svg).toContain('data-highlight-label="SOURCE"')
          expect(svg).toContain('data-highlight-label="DRAIN"')
          expect(svg).not.toContain('data-highlight-label="GATE"')
        } else {
          expect(svg).not.toContain('class="pin-label-collision-highlight"')
        }
        expect(svg).toMatchSvgSnapshot(
          import.meta.path,
          `${vertical ? "top-bottom" : "left-right"}-${stage}`,
        )
      }
    }
  }
})
