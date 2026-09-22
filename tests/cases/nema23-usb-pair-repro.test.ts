import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { nema23UsbSheet as circuitJson } from "../assets/nema23-usb-sheet"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// Raspberry Pi draws R3/R4 as parallel USB signal paths in Figure 9.
// https://datasheets.raspberrypi.com/rp2040/hardware-design-with-rp2040.pdf#page=12
test("records the separated USB resistor pair on the complete NEMA23 programming sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 14)
  expectReproNets(circuitJson, [
    ["R_USB1.pin1", "J_USB.B7", "J_USB.A7"],
    ["R_USB1.pin2", "U1.USB_DM"],
    ["R_USB2.pin1", "J_USB.B6", "J_USB.A6"],
    ["R_USB2.pin2", "U1.USB_DP"],
  ])
  expect(getReproSchematicComponent(circuitJson, "R_USB1").center).toEqual({
    x: 4.25,
    y: -3.66,
  })
  expect(getReproSchematicComponent(circuitJson, "R_USB2").center).toEqual({
    x: 11.75,
    y: -3.66,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: [
        "TraceCanBeSimplifiedByMovingComponent",
        "ComponentPinsWouldAlignWithVerticalShift",
        "TwoPinComponentCouldBeFlipped",
      ],
    }),
  ).toEqual([])
  const pair = analysis.getIssues({
    issueTypes: ["UsbSeriesResistorsNotAligned"],
  })
  expect(pair).toMatchObject([
    {
      positiveResistorSchematicBox: { sourceComponentName: "R_USB2" },
      negativeResistorSchematicBox: { sourceComponentName: "R_USB1" },
      signalAxis: "horizontal",
    },
  ])
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    issueTypes: ["UsbSeriesResistorsNotAligned"],
    showFullSchematic: true,
    showOverlay: true,
    showListingIssueMarkers: true,
    width: 1800,
    height: 1200,
  })
  const number = analysis.getIssues().indexOf(pair[0]!) + 1
  // Both resistors and the diagnostic share the same issue number.
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)].map((m) => Number(m[1])),
  ).toEqual([number, number])
  expect(svg).toContain(`data-listing-issue-number="${number}"`)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
