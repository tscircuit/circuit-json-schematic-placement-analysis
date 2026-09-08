import { parseReproCircuitJson } from "../repros/import-circuit-json"
import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { wirelessMouseSensorSheetCircuitJson as circuitJson } from "../assets/wireless-mouse-sensor-sheet"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("records the real sensor's three trace suggestions and isolates one exact trace", () => {
  const imported = parseReproCircuitJson(JSON.stringify(circuitJson))
  expect(imported).toEqual(circuitJson)
  expect(() => parseReproCircuitJson("{}")).toThrow(
    "Expected a Circuit JSON array",
  )
  expect(() => parseReproCircuitJson("[null]")).toThrow("index 0")
  expect(() => parseReproCircuitJson("[]")).toThrow("No schematic components")
  const analysis = analyzeSchematicPlacement(imported)
  expect(
    Object.entries(analysis.getIssueCounts()).filter(([, count]) => count > 0),
  ).toEqual([
    ["TraceCanBeSimplifiedByMovingComponent", 3],
    ["TwoPinComponentCouldBeFlipped", 2],
  ])
  expect(analysis.getIssues()).toHaveLength(5)
  const input = {
    circuitJson,
    analysis,
    issueTypes: ["TraceCanBeSimplifiedByMovingComponent" as const],
    issueIndex: 1,
  }
  const svg = createIssueOverlaySvg(input)
  expect(svg.match(/data-issue-index=/g)).toHaveLength(1)
  expect(svg).toContain('data-issue-index="1"')
  const issue = analysis.getIssues()[1]!
  if (issue.lineItemType !== "TraceCanBeSimplifiedByMovingComponent")
    throw new Error("Expected trace issue")
  const trace = circuitJson.find(
    (element) =>
      element.type === "schematic_trace" &&
      element.schematic_trace_id === issue.schematicTraceId,
  )
  if (trace?.type !== "schematic_trace")
    throw new Error("Missing reported trace")
  for (const edge of trace.edges)
    expect(svg).toContain(
      `<line x1="${edge.from.x}" y1="${edge.from.y}" x2="${edge.to.x}" y2="${edge.to.y}" stroke="#dc2626"`,
    )
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})
