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
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      showFullSchematic: true,
      showOverlay: false,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
