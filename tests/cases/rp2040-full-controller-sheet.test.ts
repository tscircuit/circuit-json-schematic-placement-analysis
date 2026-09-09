import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  getRp2040BldcSheet,
  getRp2040BldcSheetSvg,
  rp2040BldcCircuitJson,
} from "../assets/rp2040-bldc-controller"
import {
  createIssueOverlaySvg,
  getReproSheets,
} from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// USB reference: RP2040 hardware design guide, Figure 9 (PDF page 12).
// https://datasheets.raspberrypi.com/rp2040/hardware-design-with-rp2040.pdf#page=12
test("records the full controller sheet's current findings around the unreported USB layout", () => {
  expect(
    getReproSheets(rp2040BldcCircuitJson).map((sheet) => sheet.name),
  ).toEqual(["controller", "hall", "encoder", "power_input", "power"])
  const circuitJson = getRp2040BldcSheet("controller")
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(39)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    TraceCanBeSimplifiedByMovingComponent: 3,
    NetLabelCollision: 1,
    TwoPinComponentShouldBeVertical: 1,
  })
  // None of these three suggestions addresses J_USB or R_USB1/R_USB2.
  expect(
    analysis
      .getIssues()
      .flatMap((issue) =>
        issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent"
          ? [issue.targetComponent.sourceComponentName]
          : [],
      ),
  ).toEqual(["U3", "TP_3V3", "U1"])
  const input = {
    circuitJson,
    analysis,
    cropToIssues: false,
    schematicSvg: getRp2040BldcSheetSvg("controller"),
    width: 1800,
    height: 1200,
  }
  const svg = createIssueOverlaySvg(input)
  expect(createIssueOverlaySvg({ ...input, showOverlay: false })).toBe(
    getRp2040BldcSheetSvg("controller"),
  )
  expect(svg.match(/^<svg\b[^>]*>/)![0]).not.toContain("viewBox=")
  expect(svg.match(/data-issue-index=/g)).toHaveLength(
    analysis.getIssues().length,
  )
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})
