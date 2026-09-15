import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTraceSimplificationCircuitJson } from "../assets/trace-simplification"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("rejects an otherwise improving move when another proposed trace path hits a component", async () => {
  const original = await createTraceSimplificationCircuitJson()
  const port = original.find(
    (e) =>
      e.type === "schematic_port" && e.schematic_port_id === "schematic_port_2",
  )!
  if (port.type !== "schematic_port") throw new Error("Missing resistor port")
  original.push({
    ...port,
    schematic_port_id: "remote_port",
    schematic_component_id: "remote_component",
    source_port_id: "remote_source_port",
    center: { x: 2, y: 4 },
    facing_direction: "down",
  })
  original.push({
    type: "schematic_component",
    schematic_component_id: "remote_component",
    is_box_with_pins: true,
    center: { x: 2, y: 4.6 },
    size: { width: 0.4, height: 0.4 },
  })
  const points = [
    port.center,
    { x: 0, y: 3.275 },
    { x: 2, y: 3.275 },
    { x: 2, y: 4 },
  ]
  original.push({
    type: "schematic_trace",
    schematic_trace_id: "secondary",
    source_trace_id: "secondary_source",
    edges: points.slice(1).map((to, i) => ({ from: points[i]!, to })),
    junctions: [],
  })
  for (const blocked of [false, true]) {
    const circuitJson = structuredClone(original)
    if (blocked)
      circuitJson.push({
        type: "schematic_component",
        schematic_component_id: "obstacle",
        is_box_with_pins: true,
        center: { x: 0.8, y: 2.9 },
        size: { width: 0.2, height: 0.2 },
      })
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issues = analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    })
    expect(issues).toHaveLength(blocked ? 0 : 1)
    if (!blocked) {
      const issue = issues[0]!
      if (issue.lineItemType !== "TraceCanBeSimplifiedByMovingComponent")
        throw new Error("Expected movement")
      expect(issue.targetComponent.sourceComponentName).toBe("R11")
      expect(
        issue.suggestedTraces?.map((trace) => trace.schematicTraceId),
      ).toContain("secondary")
    }
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson,
        analysis,
        highlightIssues: ["TraceCanBeSimplifiedByMovingComponent"],
      }),
    ).toMatchSvgSnapshot(import.meta.path, blocked ? "blocked" : "clear")
  }
})
