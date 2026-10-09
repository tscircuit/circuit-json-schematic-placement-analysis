import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { createQrngDualAmplifier } from "../assets/qrng-dual-amplifier"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the full QRNG sheet with two sideways transistor stages", async () => {
  const circuitJson = await createQrngDualAmplifier()
  expectReproRendered(circuitJson, 18)
  const connected = getSourceConnectivity(circuitJson)
  const net = (name: string, pin: string) =>
    connected(getReproSourcePort(circuitJson, name, pin).source_port_id)
  const expectedNets = [
    [
      "PWR_IN.pin1",
      "C_PWR1.pin1",
      "C_PWR2.pin1",
      "R_BIAS.pin1",
      "R1C.pin1",
      "R1B.pin1",
      "R2C.pin1",
      "R2B.pin1",
    ],
    [
      "PWR_IN.pin2",
      "C_PWR1.pin2",
      "C_PWR2.pin2",
      "D_ZENER.anode",
      "R1E.pin2",
      "R2E.pin2",
      "D_CLAMP.anode",
      "OUT_TEENSY.pin2",
    ],
    ["R_BIAS.pin2", "D_ZENER.cathode", "C1.pin1"],
    ["C1.pin2", "Q1.pin2", "R1B.pin2"],
    ["Q1.pin1", "R1C.pin2", "C2.pin1"],
    ["Q1.pin3", "R1E.pin1"],
    ["C2.pin2", "Q2.pin2", "R2B.pin2"],
    ["Q2.pin1", "R2C.pin2", "C_OUT.pin1"],
    ["Q2.pin3", "R2E.pin1"],
    ["C_OUT.pin2", "D_CLAMP.cathode", "OUT_TEENSY.pin1"],
  ]
  const keys = expectedNets.map((endpoints) => {
    const keys = endpoints.map((endpoint) => {
      const [name, pin] = endpoint.split(".")
      return net(name!, pin!)
    })
    expect(new Set(keys).size).toBe(1)
    return keys[0]
  })
  expect(new Set(keys).size).toBe(10)
  expect(circuitJson.filter((e) => e.type === "source_port")).toHaveLength(38)
  for (const [name, x, y] of [
    ["Q1", -0.275, 2.765],
    ["Q2", -0.6025, -2.82945535],
  ] as const) {
    const placed = getReproSchematicComponent(circuitJson, name)
    expect(placed.center.x).toBeCloseTo(x)
    expect(placed.center.y).toBeCloseTo(y)
    for (const [pin, facing] of [
      ["pin1", "left"],
      ["pin2", "down"],
      ["pin3", "right"],
    ] as const) {
      const sourcePort = getReproSourcePort(circuitJson, name, pin)
      const schematicPort = circuitJson.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === sourcePort.source_port_id,
      )
      expect(
        schematicPort?.type === "schematic_port" &&
          schematicPort.facing_direction,
      ).toBe(facing)
    }
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toHaveLength(20)
  expect(analysis.getIssueCounts().TraceCanBeSimplifiedByMovingComponent).toBe(
    0,
  )
  expect(analysis.getIssueCounts().LowSideTransistorNotAlignedWithLoad).toBe(0)
  const svg = createSchematicAnalysisFixtureSvg({
    circuitJson,
    analysis,
    highlightIssues: ["TransistorHasIncorrectRailOrientation"],
    width: 1500,
    height: 1500,
  })
  expect([...svg.matchAll(/class="issue-marker"/g)]).toHaveLength(6)
  expect([...svg.matchAll(/data-listing-issue-number=/g)]).toHaveLength(2)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
