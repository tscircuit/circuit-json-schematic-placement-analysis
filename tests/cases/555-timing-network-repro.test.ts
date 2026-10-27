import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { create555TimingNetwork } from "../assets/555-timing-network"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the published 555 timing chain and its missed grouping after orientation fixes", async () => {
  for (const orientationOnly of [false, true]) {
    const json = await create555TimingNetwork(orientationOnly)
    expectReproRendered(json, 7)
    for (const [name, x, y] of [
      ["J_PWR", -5, 2],
      ["U1", 0, 0],
      ["R1", -2, 4],
      ["R2", 2, 4],
      ["C1", 2, -4],
      ["C2", -2, -4],
      ["J_OUT", 5, 0],
    ] as const) {
      expect(getReproSchematicComponent(json, name).center).toEqual({ x, y })
    }
    expectReproNets(json, [
      ["J_PWR.pin1", "U1.pin8", "U1.pin4", "R1.pin1", "net.VCC"],
      ["J_PWR.pin2", "U1.pin1", "C1.pin2", "C2.pin2", "J_OUT.pin2", "net.GND"],
      ["R1.pin2", "R2.pin1", "U1.pin7"],
      ["R2.pin2", "C1.pin1", "U1.pin6", "U1.pin2"],
      ["C2.pin1", "U1.pin5"],
      ["J_OUT.pin1", "U1.pin3"],
    ])
    const analysis = analyzeSchematicPlacement(json)
    expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual(
      orientationOnly
        ? []
        : [
            "TwoPinComponentCouldBeFlipped",
            "TwoPinComponentShouldBeVertical",
            "TwoPinComponentShouldBeVertical",
            "TwoPinComponentShouldBeVertical",
          ],
    )
    expect(
      createIssueReproSnapshot({
        circuitJson: json,
        analysis,
        showFullSchematic: true,
        showIssueGeometry: false,
        showListingIssueMarkers: true,
        width: 1400,
        height: 1000,
      }),
    ).toMatchSvgSnapshot(
      import.meta.path,
      orientationOnly ? "orientation-only" : "source-layout",
    )
  }
})
