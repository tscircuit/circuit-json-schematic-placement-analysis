import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { createEreaderDisplay } from "../assets/ereader-diode-capacitor-stage"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete E-Reader display sheet with separated D2/D3/C16", async () => {
  const circuitJson = await createEreaderDisplay()
  expectReproRendered(circuitJson, 26)
  expect(circuitJson.filter((e) => e.type === "source_port")).toHaveLength(75)
  const groups = [
    [
      "C15.pin1",
      "C19.pin1",
      "C20.pin1",
      "C21.pin2",
      "J2.pin15",
      "J2.pin16",
      "L1.pin1",
      "R18.pin2",
      "R19.pin2",
      "R21.pin2",
    ],
    [
      "C15.pin2",
      "C17.pin2",
      "C19.pin2",
      "C20.pin2",
      "C21.pin1",
      "C22.pin1",
      "C23.pin1",
      "C25.pin1",
      "C27.pin1",
      "C28.pin1",
      "C29.pin1",
      "C32.pin2",
      "D3.cathode",
      "J2.pin17",
      "J2.pin6",
      "J2.pin7",
      "J2.pin8",
      "R16.pin2",
      "R17.pin2",
    ],
    ["C16.pin1", "D2.cathode", "D3.anode"],
    ["C16.pin2", "D4.anode", "L1.pin2", "Q2.pin3"],
    ["C17.pin1", "D4.cathode", "J2.pin21", "TP5.pin1"],
    ["C22.pin2", "J2.pin20"],
    ["C23.pin2", "C32.pin1", "D2.anode", "J2.pin23", "TP4.pin1"],
    ["C25.pin2", "J2.pin18"],
    ["C27.pin2", "J2.pin24"],
    ["C28.pin2", "J2.pin22"],
    ["C29.pin2", "J2.pin5"],
    ["J2.pin1"],
    ["J2.pin10", "R21.pin1"],
    ["J2.pin11"],
    ["J2.pin12", "R18.pin1"],
    ["J2.pin13"],
    ["J2.pin14"],
    ["J2.pin19"],
    ["J2.pin2", "Q2.pin1", "R16.pin1"],
    ["J2.pin25"],
    ["J2.pin26"],
    ["J2.pin3", "Q2.pin2", "R17.pin1"],
    ["J2.pin4"],
    ["J2.pin9", "R19.pin1"],
  ]
  const connected = getSourceConnectivity(circuitJson)
  const sourcePort = (endpoint: string) => {
    const [name, pin] = endpoint.split(".")
    return getReproSourcePort(circuitJson, name!, pin!)
  }
  const keys = groups.map((group) => {
    const nets = group.map((endpoint) =>
      connected(sourcePort(endpoint).source_port_id),
    )
    expect(new Set(nets).size).toBe(1)
    return nets[0]
  })
  expect(new Set(keys).size).toBe(groups.length)
  for (const [endpoint, x, y, facing] of [
    ["C15.pin1", -1.8369701987210297e-17, 13.3, "up"],
    ["C15.pin2", 1.8369701987210297e-17, 12.7, "down"],
    ["C16.pin1", 19.5, 8.3, "up"],
    ["C16.pin2", 19.5, 7.7, "down"],
    ["C17.pin1", 23, 11.3, "up"],
    ["C17.pin2", 23, 10.7, "down"],
    ["C19.pin1", 2.5, 13.3, "up"],
    ["C19.pin2", 2.5, 12.7, "down"],
    ["C20.pin1", 5, 13.3, "up"],
    ["C20.pin2", 5, 12.7, "down"],
    ["C21.pin1", 7.5, 12.7, "down"],
    ["C21.pin2", 7.5, 13.3, "up"],
    ["C22.pin1", 11, -0.3, "down"],
    ["C22.pin2", 11, 0.3, "up"],
    ["C23.pin1", 25, 3.7, "down"],
    ["C23.pin2", 25, 4.3, "up"],
    ["C25.pin1", 8, -0.3, "down"],
    ["C25.pin2", 8, 0.3, "up"],
    ["C27.pin1", 17, -0.3, "down"],
    ["C27.pin2", 17, 0.3, "up"],
    ["C28.pin1", 14, -0.3, "down"],
    ["C28.pin2", 14, 0.3, "up"],
    ["C29.pin1", 5, -0.3, "down"],
    ["C29.pin2", 5, 0.3, "up"],
    ["C32.pin1", 27.5, 4.3, "up"],
    ["C32.pin2", 27.5, 3.7, "down"],
    ["R16.pin1", 12.5, 7.3, "up"],
    ["R16.pin2", 12.5, 6.7, "down"],
    ["R17.pin1", 16, 5.8, "up"],
    ["R17.pin2", 16, 5.2, "down"],
    ["R18.pin1", -1.8369701987210297e-17, 4.2, "down"],
    ["R18.pin2", 1.8369701987210297e-17, 4.8, "up"],
    ["R19.pin1", -1.8369701987210297e-17, 7.7, "down"],
    ["R19.pin2", 1.8369701987210297e-17, 8.3, "up"],
    ["R21.pin1", 2.5, 7.7, "down"],
    ["R21.pin2", 2.5, 8.3, "up"],
    ["L1.pin1", 15.4720875, 13.00262455, "left"],
    ["L1.pin2", 16.5279125, 12.997375450000002, "right"],
    ["D2.cathode", 22.52, 4, "right"],
    ["D2.anode", 21.48, 4, "left"],
    ["D3.cathode", 22, 7.52, "up"],
    ["D3.anode", 22, 6.4799999999999995, "down"],
    ["D4.cathode", 19.48, 11, "left"],
    ["D4.anode", 20.52, 11.000000000000002, "right"],
    ["J2.pin2", 8.75, 10.25, "right"],
    ["J2.pin3", 8.75, 9.75, "right"],
    ["J2.pin4", 5.25, 9.75, "left"],
    ["J2.pin5", 8.75, 9.25, "right"],
    ["J2.pin6", 6.55, 4.3, "down"],
    ["J2.pin7", 6.85, 4.3, "down"],
    ["J2.pin8", 7.15, 4.3, "down"],
    ["J2.pin1", 5.25, 10.25, "left"],
    ["J2.pin9", 5.25, 9.25, "left"],
    ["J2.pin10", 5.25, 8.75, "left"],
    ["J2.pin11", 5.25, 8.25, "left"],
    ["J2.pin12", 5.25, 7.75, "left"],
    ["J2.pin13", 5.25, 7.25, "left"],
    ["J2.pin14", 5.25, 6.75, "left"],
    ["J2.pin15", 6.85, 11.7, "up"],
    ["J2.pin16", 7.15, 11.7, "up"],
    ["J2.pin17", 7.45, 4.3, "down"],
    ["J2.pin18", 8.75, 8.75, "right"],
    ["J2.pin19", 8.75, 8.25, "right"],
    ["J2.pin20", 8.75, 7.75, "right"],
    ["J2.pin21", 8.75, 7.25, "right"],
    ["J2.pin22", 8.75, 6.75, "right"],
    ["J2.pin23", 8.75, 6.25, "right"],
    ["J2.pin24", 8.75, 5.75, "right"],
    ["J2.pin25", 5.25, 6.25, "left"],
    ["J2.pin26", 5.25, 5.75, "left"],
    ["Q2.pin3", 16.1, 8.5, "up"],
    ["Q2.pin1", 15.500000000000002, 8.1, "left"],
    ["Q2.pin2", 16.1, 7.5, "down"],
    ["TP4.pin1", 29.3, 4.8, "left"],
    ["TP5.pin1", 24.8, 11.8, "left"],
  ] as const) {
    const id = sourcePort(endpoint).source_port_id
    const port = circuitJson.find(
      (e) => e.type === "schematic_port" && e.source_port_id === id,
    )
    if (port?.type !== "schematic_port")
      throw new Error("Missing rendered port")
    expect(port.center.x).toBeCloseTo(x, 6)
    expect(port.center.y).toBeCloseTo(y, 6)
    expect(port.facing_direction).toBe(facing)
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toEqual([])
  const svg = createSchematicAnalysisFixtureSvg({
    circuitJson,
    analysis,
    width: 1800,
    height: 1200,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
