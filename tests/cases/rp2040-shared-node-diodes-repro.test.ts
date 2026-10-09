import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { createRp2040LogicPower } from "../assets/rp2040-shared-node-diodes"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete RP2040 logic power sheet with inline diode branches", async () => {
  const circuitJson = await createRp2040LogicPower()
  expectReproRendered(circuitJson, 19)
  const connected = getSourceConnectivity(circuitJson)
  const net = (component: string, pin: string) =>
    connected(getReproSourcePort(circuitJson, component, pin).source_port_id)
  expect(net("D2", "cathode")).toBe(net("D5", "cathode"))
  expect(net("D2", "cathode")).toBe(net("U3", "VIN"))
  expect(net("D2", "anode")).not.toBe(net("D5", "anode"))
  expect(
    new Set([net("D2", "anode"), net("D5", "anode"), net("D2", "cathode")])
      .size,
  ).toBe(3)
  for (const [name, y] of [
    ["D2", 7.5],
    ["D5", 2.5],
  ] as const) {
    const port = getReproSourcePort(circuitJson, name, "cathode")
    const placed = circuitJson.find(
      (e) =>
        e.type === "schematic_component" &&
        e.source_component_id === port.source_component_id,
    )
    expect(placed?.type === "schematic_component" && placed.center).toEqual({
      x: -10,
      y,
    })
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toHaveLength(6)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
