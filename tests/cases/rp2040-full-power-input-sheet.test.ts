import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// Compare the ORing power paths with LM74700-Q1 Figure 10-1.
// https://www.ti.com/lit/ds/symlink/lm74700-q1.pdf#page=16
test("records the full input sheet's local trace suggestions without rearranging its ORing branches", () => {
  const circuitJson = getRp2040BldcSheet("power_input")
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(31)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    GenericSchematicBoxTooWide: 2,
    SchematicBoxInnerLabelCollision: 6,
    SchematicPinPaddingToEdgeTooLarge: 26,
    DiodeResistorNotAligned: 1,
    TraceCanBeSimplifiedByMovingComponent: 4,
    NetLabelCollision: 1,
    SchematicTextCollision: 1,
    TwoPinComponentShouldBeVertical: 6,
  })
  // The two ORing suggestions straighten local wires; they don't expose the
  // complete input -> MOSFET -> VIN_SELECTED paths as in the reference.
  expect(
    analysis
      .getIssues()
      .flatMap((issue) =>
        issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent"
          ? [issue.targetComponent.sourceComponentName]
          : [],
      ),
  ).toEqual(["D_PD_VBUS", "R_PD_RESET", "U_PD_OR", "U_BARREL_OR"])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: [
        "TraceCanBeSimplifiedByMovingComponent",
        "NetLabelCollision",
      ],
      cropToIssues: false,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
