import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPeltierDifferentialFilter } from "../assets/peltier-differential-filter"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("reproduces the published TPS55289 differential RC filter without changing chip pins or connections", async () => {
  const j = await createPeltierDifferentialFilter()
  expectReproRendered(j, 4)
  for (const [name, x, y] of [
    ["U_DRIVER", 0, 0],
    ["R_ISP_FILTER", 6.75, -0.9],
    ["R_ISN_FILTER", 7.25, -2.1],
    ["C_CURRENT_FILTER", 4.5, -1.5],
  ] as const)
    expect(getReproSchematicComponent(j, name).center).toEqual({ x, y })
  expectReproNets(j, [
    ["R_ISP_FILTER.pin1", "net.DRIVER_OUT"],
    ["R_ISN_FILTER.pin1", "net.TEC_POS"],
    ["R_ISP_FILTER.pin2", "C_CURRENT_FILTER.pin1", "U_DRIVER.pin12"],
    ["R_ISN_FILTER.pin2", "C_CURRENT_FILTER.pin2", "U_DRIVER.pin13"],
  ])
  for (const name of ["R_ISP_FILTER", "R_ISN_FILTER"]) {
    expect(
      j.find((e) => e.type === "source_component" && e.name === name),
    ).toMatchObject({
      resistance: 10,
      manufacturer_part_number: "0603WAF100JT5E",
      supplier_part_numbers: { jlcpcb: ["C22859"] },
    })
  }
  expect(
    j.find(
      (e) => e.type === "source_component" && e.name === "C_CURRENT_FILTER",
    ),
  ).toMatchObject({
    capacitance: 220e-9,
    max_voltage_rating: 50,
  })
  expect(
    j.find((e) => e.type === "source_net" && e.name === "TEC_POS"),
  ).toMatchObject({
    is_power: true,
    is_positive_voltage_source: true,
  })
  const analysis = analyzeSchematicPlacement(j)
  expect(
    analysis
      .getIssues()
      .map((i) => i.lineItemType)
      .sort(),
  ).toEqual([
    "DifferentialRcFilterNotAligned",
    "GenericSchematicBoxTooWide",
    "SchematicPinPaddingToEdgeTooLarge",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson: j,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 850,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "filter")
})
