import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { esp32UsbDucky as circuitJson } from "../assets/esp32-usb-ducky"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI TLV757P typical application places each capacitor beside its connected port.
// https://www.ti.com/lit/ds/symlink/tlv757p.pdf#page=1
test("records reversed regulator capacitor placement on the complete ESP32 ducky sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 46)
  expectReproNets(circuitJson, [
    ["U2.IN", "C1.pin1", "net.VBUS"],
    ["U2.OUT", "C2.pin1", "net.V3V3"],
    ["U2.GND", "C1.pin2", "C2.pin2", "net.GND"],
  ])
  expect(getReproSchematicComponent(circuitJson, "U2").center).toEqual({
    x: -10,
    y: -8.68,
  })
  expect(getReproSchematicComponent(circuitJson, "C1").center).toEqual({
    x: -14,
    y: -8,
  })
  expect(getReproSchematicComponent(circuitJson, "C2").center).toEqual({
    x: -6,
    y: -8,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    }),
  ).toEqual([])
  const issues = analysis.getIssues({
    issueTypes: ["RegulatorCapacitorsOnWrongSides"],
  })
  expect(
    issues.map(
      (issue) =>
        issue.lineItemType === "RegulatorCapacitorsOnWrongSides" &&
        issue.regulatorSchematicBox.sourceComponentName,
    ),
  ).toEqual(["U2"])
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    issueTypes: ["RegulatorCapacitorsOnWrongSides"],
    showFullSchematic: true,
    showOverlay: true,
    showListingIssueMarkers: true,
    width: 1800,
    height: 1200,
  })
  const numbers = issues.map((issue) => analysis.getIssues().indexOf(issue) + 1)
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)]
      .map((match) => Number(match[1]))
      .sort((a, b) => a - b),
  ).toEqual(numbers.flatMap((number) => [number, number, number]))
  expect(
    [...svg.matchAll(/data-listing-issue-number="(\d+)"/g)].map((match) =>
      Number(match[1]),
    ),
  ).toEqual(numbers)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
