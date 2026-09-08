import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createFourWayJunctionCircuitJson } from "../assets/four-way-junction"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createFourWayJunctionCircuitJson()
  expectReproRendered(circuitJson, 4)
  expectReproNets(circuitJson, [
    ["R1.pin1", "net.LEFT"],
    ["R2.pin2", "net.RIGHT"],
    ["R3.pin2", "net.TOP"],
    ["R4.pin1", "net.BOTTOM"],
    ["R1.pin2", "R2.pin1", "R3.pin1", "R4.pin2"],
  ])

  const traces = circuitJson.filter(
    (element) => element.type === "schematic_trace",
  )
  expect(
    traces.some((trace) =>
      trace.junctions.some(
        (point) => Math.abs(point.x) < 0.01 && Math.abs(point.y) < 0.01,
      ),
    ),
  ).toBe(true)
  const edges = traces.flatMap((trace) => trace.edges)
  // Assert all four arms survive routing; four connected ports alone are insufficient.
  expect(
    edges.some(
      ({ from, to }) =>
        Math.abs(from.y) < 0.01 &&
        Math.abs(to.y) < 0.01 &&
        Math.min(from.x, to.x) < -1 &&
        Math.max(from.x, to.x) > 1,
    ),
  ).toBe(true)
  expect(
    edges.some(
      ({ from, to }) =>
        Math.abs(from.x) < 0.01 &&
        Math.abs(to.x) < 0.01 &&
        Math.min(from.y, to.y) < -1 &&
        Math.max(from.y, to.y) > 1,
    ),
  ).toBe(true)

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
  issueTypes = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues"
        ? item.issues.map((issue) => issue.lineItemType)
        : [],
    )
})

test.failing("reports four connected wire branches meeting at one junction", () => {
  expect(issueTypes).toContain("FourWayJunction")
})
