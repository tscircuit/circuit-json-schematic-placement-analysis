import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPassiveTraceMovement } from "../assets/passive-trace-movement"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("prefers a verified capacitor or resistor move over moving the connected IC", async () => {
  for (const name of ["C1", "R1"]) {
    const circuitJson = await createPassiveTraceMovement(name)
    const withoutPassivePrefix = structuredClone(circuitJson)
    const source = withoutPassivePrefix.find(
      (e) => e.type === "source_component" && e.name === name,
    )!
    if (source.type !== "source_component") throw new Error("Missing passive")
    source.name = "X1"
    expect(
      analyzeSchematicPlacement(withoutPassivePrefix).getIssues({
        issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
      })[0],
    ).toMatchObject({ targetComponent: { sourceComponentName: "U1" } })
    const analysis = analyzeSchematicPlacement(circuitJson)
    const moves = analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    })
    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({
      targetComponent: { sourceComponentName: name },
      suggestedTurnCount: 1,
    })
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson,
        analysis,
        highlightIssues: true,
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
