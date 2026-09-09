import { expect, test } from "bun:test"
import type { SchematicPort } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { analyzeSchematicPlacement } from "lib/index"
import { parseSync, type INode } from "svgson"
import {
  getTrellisCoreSheetCircuitJson,
  trellisCoreCircuitJson,
} from "../assets/trellis-core"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces Trellis Core's published CPU decoupling layout before grouping fixes", () => {
  const original = JSON.stringify(trellisCoreCircuitJson)
  expectReproRendered(trellisCoreCircuitJson, 92)
  expect(
    trellisCoreCircuitJson
      .filter((element) => element.type === "schematic_sheet")
      .map((sheet) => sheet.name),
  ).toEqual(["power", "cpu-core", "cpu-io", "storage", "usb"])

  const circuitJson = getTrellisCoreSheetCircuitJson("cpu-core")
  expectReproRendered(circuitJson, 40)
  const caps = (first: number, last: number, pin: number) =>
    Array.from(
      { length: last - first + 1 },
      (_, i) => `C${first + i}.pin${pin}`,
    )
  expectReproNets(circuitJson, [
    ["net.P3V3", ...caps(9, 15, 1)],
    ["net.P1V8", ...caps(16, 21, 1), "C34.pin1", "C35.pin1"],
    ["net.P0V9", ...caps(22, 27, 1)],
    ["net.P1V5", ...caps(28, 31, 1)],
    ["net.GND", ...caps(9, 31, 2), "C34.pin2", "C35.pin2"],
  ])

  // Preserve the reviewed placement: the P3V3 bank spans 12 schematic units;
  // P1V8 also has C34/C35 in a separate cluster below C16–C21.
  for (const [name, x, y] of [
    ["C9", -12, 8],
    ["C15", 0, 8],
    ["C16", 2, 8],
    ["C21", 12, 8],
    ["C34", 5, 5],
    ["C35", 7, 5],
  ] as const) {
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y,
    })
  }

  const analysis = analyzeSchematicPlacement(circuitJson)
  // These are current reports, not the desired grouping behavior. The analyzer
  // does not implement DecouplingCapacitorsNotCloseTogether yet.
  expect(
    Object.entries(analysis.getIssueCounts()).filter(([, count]) => count > 0),
  ).toEqual([
    ["TraceCanBeSimplifiedByMovingComponent", 3],
    ["CrystalNotCenteredOverLoadCapacitors", 1],
    ["TwoPinComponentShouldBeVertical", 5],
  ])
  const svg = createSchematicAnalysisFixtureSvg({
    circuitJson,
    analysis,
    width: 1800,
    height: 1200,
  }).replace(/[ \t]+$/gm, "")

  const descendants = (node: INode): INode[] => [
    node,
    ...node.children.flatMap(descendants),
  ]
  const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson)
  const nodes = descendants(parseSync(schematicSvg))
  const pathPoints = (path: INode) =>
    [
      ...(path.attributes.d ?? "").matchAll(
        /[ML]\s*([\d.e+-]+)[ ,]+([\d.e+-]+)/gi,
      ),
    ].map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))
  const tracePoints = nodes
    .filter((node) => node.attributes.class === "sch-trace-path")
    .flatMap(pathPoints)
  const matrix = schematicSvg.match(
    /data-real-to-screen-transform="matrix\(([^)]+)\)"/,
  )
  expect(matrix).not.toBeNull()
  const [a, b, c, d, e, f] = matrix![1]!.split(",").map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]

  // Both visible symbol leads and traces must meet the
  // actual ports. A snapshot alone can accidentally accept disconnected leads.
  for (const name of ["C28", "C29"]) {
    const component = getReproSchematicComponent(circuitJson, name)
    const symbol = nodes.find(
      (node) =>
        node.attributes["data-schematic-component-id"] ===
        component.schematic_component_id,
    )
    expect(symbol).toBeDefined()
    const symbolPoints = descendants(symbol!)
      .filter((node) => node.attributes.class === "sch-component-symbol-path")
      .flatMap(pathPoints)
    const ports = circuitJson.filter(
      (element): element is SchematicPort =>
        element.type === "schematic_port" &&
        element.schematic_component_id === component.schematic_component_id,
    )
    expect(ports).toHaveLength(2)
    for (const port of ports) {
      const x = a * port.center.x + c * port.center.y + e
      const y = b * port.center.x + d * port.center.y + f
      for (const points of [tracePoints, symbolPoints]) {
        expect(
          Math.min(
            ...points.map((point) => Math.hypot(point.x - x, point.y - y)),
          ),
        ).toBeLessThan(1e-6)
      }
    }
  }
  expect(svg).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(trellisCoreCircuitJson)).toBe(original)
})
