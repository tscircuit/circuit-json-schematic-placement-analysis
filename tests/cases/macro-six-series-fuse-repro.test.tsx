import { Circuit } from "@tscircuit/core"
import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("accepts a horizontal fuse in a series power path", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false}>
      <net name="VBUS" isPowerNet />
      <net name="FUSED_5V" isPowerNet />
      <fuse
        name="F1"
        currentRating="500mA"
        voltageRating="6V"
        manufacturerPartNumber="nSMD050"
        supplierPartNumbers={{ jlcpcb: ["C69688"] }}
        schX={-8.75}
        schY={4.2}
      />
      <trace from="net.VBUS" to=".F1 > .pin1" />
      <trace from=".F1 > .pin2" to="net.FUSED_5V" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()

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
  expect(analysis.getIssues()).toHaveLength(0)
  expect(analysis.getIssueCounts().TwoPinComponentShouldBeVertical).toBe(0)

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
