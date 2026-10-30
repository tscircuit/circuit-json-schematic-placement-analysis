import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createBoostConverterDivider } from "../assets/boost-converter-divider"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the published divider behind U1 after existing rotation advice", async () => {
  for (const mode of ["original", "before"] as const) {
    const json = await createBoostConverterDivider(mode)
    expectReproRendered(json, 3)
    for (const [name, x, y] of [
      ["U1", 0, 0],
      ["R1", 4.8, 0.4],
      ["R2", 4.8, -1.4],
    ] as const) {
      const b = getReproSchematicComponent(json, name)
      expect(b.center.x).toBeCloseTo(x, 6)
      expect(b.center.y).toBeCloseTo(y, 6)
    }
    expectReproNets(json, [
      ["R1.pin2", "R2.pin1", "U1.FB", "net.FB"],
      ["R1.pin1", "net.VOUT_12V"],
      ["R2.pin2", "U1.GND", "net.GND"],
      ["U1.IN", "U1.EN", "net.V5"],
      ["U1.SW", "net.SW"],
    ])
    const analysis = analyzeSchematicPlacement(json)
    expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual(
      mode === "original"
        ? ["TwoPinComponentShouldBeVertical", "TwoPinComponentShouldBeVertical"]
        : [],
    )
    expect(
      createIssueReproSnapshot({
        circuitJson: json,
        analysis,
        showFullSchematic: true,
        showIssueGeometry: false,
        showListingIssueMarkers: true,
        width: 1400,
        height: 650,
      }),
    ).toMatchSvgSnapshot(import.meta.path, mode)
  }
})
