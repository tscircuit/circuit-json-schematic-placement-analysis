import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTraceSimplificationCircuitJson } from "../assets/trace-simplification"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("suggests moving R11 right to remove two avoidable trace turns", async () => {
  const circuitJson = await createTraceSimplificationCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
  const simplificationIssue = issues.find(
    (issue) => issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent",
  )

  expect(simplificationIssue).toMatchObject({
    schematicTraceId: "schematic_trace_0",
    traceName: "U3.pin1 to R11.pin1",
    targetComponent: { sourceComponentName: "R11" },
    deltaSchX: 0.8,
    deltaSchY: 0,
    newSchX: 0.8,
    newSchY: 2,
    currentTurnCount: 3,
    suggestedTurnCount: 1,
  })
  expect(analysis.toString()).toContain('traceName="U3.pin1 to R11.pin1"')
  expect(analysis.toString()).not.toContain("schematicTraceId")
  expect(simplificationIssue?.message).toContain("move R11 right by 0.8")
  expect(
    analysis
      .getLineItems()
      .filter((lineItem) => lineItem.lineItemType === "SchematicBoxPlacement")
      .map((placement) => placement.sourceComponentName),
  ).toEqual(["U3", "R11"])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  if (!simplificationIssue) throw new Error("Missing verified movement")
  expect(simplificationIssue.suggestedTraces).toHaveLength(1)
  const route = simplificationIssue.suggestedTraces![0]!
  expect(route.points).toHaveLength(3)
  expect(route.points[1]).toEqual({ x: 0.8, y: 0 })
  expect(route.points[2]).toEqual({ x: 0.8, y: 1.45 })
  // Independently render the actual component at the recommended position.
  const movedJson = await createTraceSimplificationCircuitJson({
    resistorSchX: simplificationIssue.newSchX,
  })
  const movedTrace = movedJson.find((e) => e.type === "schematic_trace")!
  if (movedTrace.type !== "schematic_trace")
    throw new Error("Missing rerouted trace")
  expect(movedTrace.edges).toHaveLength(2)
  for (const [i, edge] of movedTrace.edges.entries()) {
    expect(edge.to.x).toBeCloseTo(route.points[i + 1]!.x, 10)
    expect(edge.to.y).toBeCloseTo(route.points[i + 1]!.y, 10)
  }
  const movedAnalysis = analyzeSchematicPlacement(movedJson)
  expect(
    movedAnalysis.getIssueCounts().TraceCanBeSimplifiedByMovingComponent,
  ).toBe(0)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: movedJson,
      analysis: movedAnalysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "after")
})
