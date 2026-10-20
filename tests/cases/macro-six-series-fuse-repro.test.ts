import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMacroSixSeriesFuseCircuitJson } from "../assets/macro-six-series-fuse"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces a horizontal series fuse reported as a vertical rail branch", async () => {
  const circuitJson = await createMacroSixSeriesFuseCircuitJson()
  expectReproRendered(circuitJson, 1)
  expectReproNets(circuitJson, [
    ["net.VBUS", "F1.pin1"],
    ["F1.pin2", "net.FUSED_5V"],
  ])
  for (const name of ["VBUS", "FUSED_5V"]) {
    expect(
      circuitJson.find(
        (element) => element.type === "source_net" && element.name === name,
      ),
    ).toMatchObject({ is_power: true })
  }
  expect(
    circuitJson.find(
      (element) => element.type === "source_component" && element.name === "F1",
    ),
  ).toMatchObject({
    ftype: "simple_fuse",
    current_rating_amps: 0.5,
    voltage_rating_volts: 6,
  })

  const fuse = getReproSchematicComponent(circuitJson, "F1")
  expect(fuse.symbol_name).toBe("fuse_horz")
  expect(fuse.center).toEqual({ x: -8.75, y: 4.2 })

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toHaveLength(1)
  expect(analysis.getIssues()[0]).toMatchObject({
    lineItemType: "TwoPinComponentShouldBeVertical",
    schematicBox: { sourceComponentName: "F1" },
    railType: "power",
  })
  expect(analysis.getIssueCounts().TwoPinComponentShouldBeVertical).toBe(1)

  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1000,
      height: 500,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
