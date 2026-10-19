import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createAstraFuseDiode } from "../assets/astra-fuse-diode"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the published Astra fuse and diode with perpendicular terminals", async () => {
  const positions: Record<string, [number, number]> = {
    D_MOTOR_BLOCK: [0, -7.5],
    F_MOTOR_VBUS: [-3, -7.5],
    C_PD_VBUS: [3, -7.5],
    C_MOTOR_BULK: [6, -7.5],
    D_MOTOR_TVS: [9, -7.5],
  }
  for (const [scope, count] of [
    ["pair", 2],
    ["filter", 5],
  ] as const) {
    const circuitJson = await createAstraFuseDiode(false, scope)
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
        ? [["F_MOTOR_VBUS.pin2", "D_MOTOR_BLOCK.anode"]]
        : [
            ["F_MOTOR_VBUS.pin2", "D_MOTOR_BLOCK.anode"],
            [
              "D_MOTOR_BLOCK.cathode",
              "C_PD_VBUS.pin1",
              "C_MOTOR_BULK.pin1",
              "D_MOTOR_TVS.cathode",
            ],
            [
              "C_PD_VBUS.pin2",
              "C_MOTOR_BULK.pin2",
              "D_MOTOR_TVS.anode",
              "net.GND",
            ],
          ],
    )
    const analysis = analyzeSchematicPlacement(circuitJson)
    expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
      "FuseDiodeNotAligned",
    ])
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        width: 1200,
        height: scope === "pair" ? 800 : 500,
        showFullSchematic: true,
        showIssueGeometry: false,
        showListingIssueMarkers: true,
      }),
    ).toMatchSvgSnapshot(import.meta.path, scope)
  }
})
