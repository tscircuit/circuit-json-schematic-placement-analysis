import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { createStridePedometer } from "../assets/stride-chip-supply-inductor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete Stride sheet with L1 separated from U1", async () => {
  const circuitJson = await createStridePedometer()
  expectReproRendered(circuitJson, 78)
  expect(getReproSchematicComponent(circuitJson, "L1").center).toEqual({
    x: 0,
    y: -44,
  })
  expect(getReproSchematicComponent(circuitJson, "U1").center).toEqual({
    x: 0,
    y: 0,
  })
  const ports = circuitJson.filter((e) => e.type === "source_port")
  expect(
    new Set(ports.map((p) => `${p.source_component_id}:${p.pin_number}`)).size,
  ).toBe(ports.length)
  const connected = getSourceConnectivity(circuitJson)
  const net = (name: string, pin: string) =>
    connected(getReproSourcePort(circuitJson, name, pin).source_port_id)
  const input = net("L1", "pin1")
  const output = net("L1", "pin2")
  expect(input).toBe(net("U1", "DCDC"))
  expect(output).toBe(net("U1", "VDDR1"))
  expect(output).toBe(net("U1", "VDDR2"))
  expect(input).not.toBe(output)
  expect(
    circuitJson.filter(
      (e) => e.type === "source_port" && connected(e.source_port_id) === input,
    ),
  ).toHaveLength(2)
  expect(
    circuitJson.some(
      (e) =>
        e.type === "source_net" &&
        connected(e.source_net_id) === output &&
        e.is_power,
    ),
  ).toBe(true)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toHaveLength(36)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1800,
      height: 1600,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
