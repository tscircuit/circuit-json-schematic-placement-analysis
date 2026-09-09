import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// Compare connector/filter arrangement with TI's Hall interface, Figure 21.
// https://www.ti.com/lit/ug/slvuaq4a/slvuaq4a.pdf#page=15
// The circuit differs; the repro concerns the long A/C wire detours, not resistor values.
test("records no trace or orientation suggestions for the full Hall sheet's connector detours", () => {
  const circuitJson = getRp2040BldcSheet("hall")
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(10)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    PinHeaderSchematicBoxTooWide: 1,
  })
  const input = {
    circuitJson,
    analysis,
    showFullSchematic: true,
    width: 1800,
    height: 1200,
  }
  // Preserve the missing detection explicitly; don't invent an overlay for it.
  expect(
    analysis.getIssues({
      issueTypes: [
        "TraceCanBeSimplifiedByMovingComponent",
        "TwoPinComponentCouldBeFlipped",
      ],
    }),
  ).toEqual([])
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})
