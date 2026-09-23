import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { esp32UsbDucky as circuitJson } from "../assets/esp32-usb-ducky"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// Compare the paired series resistors with Espressif's USB RC schematic.
// https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32s3/schematic-checklist.html#fig-usb-rc-schematic
test("records the USB resistor pair and existing R3 flip on the complete ESP32 ducky sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 46)
  expectReproNets(circuitJson, [
    ["R3.pin1", "U3.IO1"],
    ["R3.pin2", "U1.IO20"],
    ["R4.pin1", "U3.IO2"],
    ["R4.pin2", "U1.IO19"],
  ])
  expect(getReproSchematicComponent(circuitJson, "R3").center).toEqual({
    x: 3,
    y: 10,
  })
  expect(getReproSchematicComponent(circuitJson, "R4").center).toEqual({
    x: -3,
    y: 10,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: [
        "TraceCanBeSimplifiedByMovingComponent",
        "ComponentPinsWouldAlignWithVerticalShift",
      ],
    }),
  ).toEqual([])
  expect(
    analysis.getIssues({ issueTypes: ["TwoPinComponentCouldBeFlipped"] }),
  ).toMatchObject([
    {
      targetComponent: { sourceComponentName: "R3" },
      deltaSchRotation: 180,
    },
  ])
  const pair = analysis.getIssues({
    issueTypes: ["UsbSeriesResistorsNotAligned"],
  })
  expect(pair).toMatchObject([
    {
      positiveResistorSchematicBox: { sourceComponentName: "R3" },
      negativeResistorSchematicBox: { sourceComponentName: "R4" },
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
