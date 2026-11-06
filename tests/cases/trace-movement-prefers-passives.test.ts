import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPassiveTraceMovement } from "../assets/passive-trace-movement"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("prefers a verified capacitor or resistor move over moving the connected IC", async () => {
  for (const name of ["C1", "R1"]) {
    const circuitJson = await createPassiveTraceMovement(name)
    const analysis = analyzeSchematicPlacement(circuitJson)
    const moves = analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    })
    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({
      targetComponent: { sourceComponentName: name },
      suggestedTurnCount: 1,
    })
    const originalMove = moves[0]!
    if (originalMove.lineItemType !== "TraceCanBeSimplifiedByMovingComponent")
      throw new Error("Expected a trace move")
    // Even misleading prefixes must not make a chip preferable to a passive.
    for (const passiveName of ["X1", "U99"]) {
      const renamed = structuredClone(circuitJson)
      for (const e of renamed) {
        if (e.type === "source_component")
          e.name =
            e.source_component_id ===
            originalMove.targetComponent.sourceComponentId
              ? passiveName
              : "C99"
        if (e.type === "source_port") {
          e.name = e.source_port_id
          delete e.port_hints
        }
      }
      expect(
        analyzeSchematicPlacement(renamed).getIssues({
          issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
        }),
      ).toMatchObject([
        {
          targetComponent: {
            sourceComponentId: originalMove.targetComponent.sourceComponentId,
            sourceComponentName: passiveName,
          },
          deltaSchX: originalMove.deltaSchX,
          deltaSchY: originalMove.deltaSchY,
          suggestedTurnCount: originalMove.suggestedTurnCount,
        },
      ])
    }
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson,
        analysis,
        highlightIssues: true,
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
