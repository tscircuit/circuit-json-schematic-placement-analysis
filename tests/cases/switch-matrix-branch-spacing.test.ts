import { beforeAll, expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createKeyboardSwitchDiodeRepro } from "../assets/keyboard-switch-series-diodes"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"

let before: CircuitJson
beforeAll(async () => {
  // The former correction: pairs are adjacent, but rows remain nine units apart.
  before = await createKeyboardSwitchDiodeRepro(true, false)
})

test("the same solver detects excess space between adjacent-pair matrix rows", async () => {
  const after = await createKeyboardSwitchDiodeRepro(true)
  const baseline = analyzeSchematicPlacement(before)
  const analysis = analyzeSchematicPlacement(after)
  expect(baseline.getIssueCounts().SwitchMatrixDiodeSeparatedFromSwitch).toBe(0)
  const issues = baseline.getIssues()
  expect(issues).toHaveLength(1)
  const issue = issues[0]!
  if (issue.lineItemType !== "SwitchMatrixBranchesTooSpreadOut")
    throw new Error("Expected a matrix spacing finding")
  expect(issue.axis).toBe("y")
  expect(issue.branchSchematicBoxes).toHaveLength(24)
  expect(issue.emptyGap).toBeGreaterThan(5)
  expect(issue.maxRecommendedEmptyGap).toBe(4)
  expect(analysis.getIssues()).toEqual([])
  const electrical = (json: CircuitJson) =>
    json.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_trace",
        "source_net",
        "source_group",
        "source_component_internal_connection",
      ].includes(e.type),
    )
  expect(electrical(after)).toEqual(electrical(before))
  const svg = createPlacementComparisonSvg({
    before: { circuitJson: before, analysis: baseline },
    after: { circuitJson: after, analysis },
    issues,
    beforeDiagnostic: () =>
      "Pairs are adjacent, but connected rows have 5.1 units of unused space.",
    afterDiagnostic:
      "Rows compacted into a 3 × 4 matrix.\nFull-sheet analysis: 0 reported issues.",
    note: "Same 92-component TSX circuit and pin connections.\nMatrix spacing is checked after each diode is beside its switch.",
  })
  expect(svg).toContain("SwitchMatrixBranchesTooSpreadOut")
  expect(svg.match(/data-issue-number="1"/g)).toHaveLength(24)
  expect(svg.match(/data-listing-issue-number="1"/g)).toHaveLength(1)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
