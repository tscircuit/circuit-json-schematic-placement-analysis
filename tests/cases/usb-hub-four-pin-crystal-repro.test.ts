import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createFourPinCrystalLoadNetwork } from "../assets/four-pin-crystal-load-network"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

// The USB2244 clock circuit uses one capacitor from each crystal signal to ground.
// https://ww1.microchip.com/downloads/aemDocuments/documents/UNG/ProductDocuments/DesignChecklist/USB2244-HW-Design-Checklist-00004319.pdf#page=8
test("records an unreported four-pin crystal load network", async () => {
  const circuitJson = await createFourPinCrystalLoadNetwork()
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 4)
  expectReproNets(circuitJson, [
    ["U1.X1", "Y1.A", "C1.pin1"],
    ["U1.X2", "Y1.B", "C2.pin1"],
    ["U1.GND", "Y1.G1", "Y1.G2", "C1.pin2", "C2.pin2", "net.GND"],
  ])

  const crystal = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "Y1",
  )
  if (crystal?.type !== "source_component") {
    throw new Error("Missing crystal Y1")
  }
  expect(crystal.ftype).toBe("simple_chip")
  expect(
    circuitJson.filter(
      (element) =>
        element.type === "source_port" &&
        element.source_component_id === crystal.source_component_id,
    ),
  ).toHaveLength(4)

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
    }),
  ).toEqual([])

  expect(analysis.getIssues()).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
      showOverlay: true,
      width: 1200,
      height: 700,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "focused")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
