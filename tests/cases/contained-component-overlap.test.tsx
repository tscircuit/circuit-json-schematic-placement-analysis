import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { centeredRect, rectOverlap } from "lib/utils/geometry"
import { stackSvgsVertically } from "stack-svgs"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("each suggested move separates a component contained inside another", async () => {
  const snapshots: string[] = []
  for (const [x, y] of [
    [0, 0],
    [-1, -0.5],
    [1, 0.5],
  ]) {
    const circuit = new Circuit()
    circuit.add(
      <board width="20mm" height="20mm">
        <chip
          name="U1"
          footprint="soic8"
          schWidth={8}
          schHeight={6}
          pinLabels={{ pin1: "VCC", pin2: "GND" }}
          schX={0}
          schY={0}
        />
        <resistor
          name="R1"
          resistance="1k"
          footprint="0402"
          schX={x}
          schY={y}
        />
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issueGroup = analysis
      .getLineItems()
      .find((item) => item.lineItemType === "SchematicPlacementIssues")
    const overlap = issueGroup?.issues.find(
      (issue) => issue.lineItemType === "ComponentOverlap",
    )
    expect(overlap).toBeDefined()
    if (!overlap || overlap.lineItemType !== "ComponentOverlap")
      throw new Error("Expected overlap")
    expect(overlap.correctionSuggestions).toHaveLength(2)
    for (const move of overlap.correctionSuggestions) {
      const target = [overlap.firstComponent, overlap.secondComponent].find(
        (component) =>
          component.sourceComponentName === move.targetComponentName,
      )!
      const other =
        target === overlap.firstComponent
          ? overlap.secondComponent
          : overlap.firstComponent
      const movedBounds = centeredRect(
        move.newSchX,
        move.newSchY,
        target.width,
        target.height,
      )
      const otherBounds = centeredRect(
        other.schX,
        other.schY,
        other.width,
        other.height,
      )
      const remaining = rectOverlap(movedBounds, otherBounds)
      // The suggested move must clear the entire containing rectangle.
      expect(
        remaining === null || Math.min(remaining.ow, remaining.oh) < 1e-9,
      ).toBe(true)
      expect(move.newSchX).toBeCloseTo(target.schX + move.deltaSchX, 9)
      expect(move.newSchY).toBeCloseTo(target.schY + move.deltaSchY, 9)
    }
    snapshots.push(
      createSchematicAnalysisFixtureSvg({
        circuitJson,
        analysis,
        width: 1000,
        height: 420,
      }),
    )
  }
  expect(stackSvgsVertically(snapshots)).toMatchSvgSnapshot(import.meta.path)
})
