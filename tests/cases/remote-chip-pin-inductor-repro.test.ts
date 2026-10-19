import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRemoteChipPinInductor } from "../assets/remote-chip-pin-inductor"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the published remote inductor above its two connected chip pins", async () => {
  const positions: Record<string, [number, number]> = {
    U2: [0, 0],
    L1: [0, 4],
    C4: [-6, 0],
    C5: [6, 0],
    R5: [6, -4],
    R6: [6, -7],
    R7: [-6, 4],
  }
  for (const [scope, count] of [
    ["pair", 2],
    ["full", 7],
  ] as const) {
    const circuitJson = await createRemoteChipPinInductor(false, scope)
    expectReproRendered(circuitJson, count)
    for (const component of circuitJson.filter(
      (e) => e.type === "source_component",
    )) {
      const [x, y] = positions[component.name!]!
      const box = getReproSchematicComponent(circuitJson, component.name!)
      expect(box.center.x).toBeCloseTo(x, 6)
      expect(box.center.y).toBeCloseTo(y, 6)
    }
    expectReproNets(
      circuitJson,
      scope === "pair"
        ? [
            ["U2.pin9", "L1.pin1"],
            ["U2.pin7", "L1.pin2"],
          ]
        : [
            ["U2.pin9", "L1.pin1"],
            ["U2.pin7", "L1.pin2"],
            ["U2.pin10", "C4.pin1", "net.VSYS"],
            ["U2.pin1", "net.BUCK_ENABLE"],
            [
              "U2.pin2",
              "U2.pin3",
              "U2.pin8",
              "C4.pin2",
              "C5.pin2",
              "R6.pin2",
              "net.GND",
            ],
            ["U2.pin6", "C5.pin1", "R5.pin1", "R7.pin1", "net.V3V3"],
            ["U2.pin4", "R5.pin2", "R6.pin1", "net.REG_FB"],
            ["U2.pin5", "R7.pin2", "net.REG_PG"],
          ],
    )
    const analysis = analyzeSchematicPlacement(circuitJson)
    expect(analysis.getIssues()).toEqual([])
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        width: 1200,
        height: scope === "pair" ? 800 : 1000,
        showFullSchematic: true,
        showIssueGeometry: false,
        showListingIssueMarkers: true,
      }),
    ).toMatchSvgSnapshot(import.meta.path, scope)
  }
})
