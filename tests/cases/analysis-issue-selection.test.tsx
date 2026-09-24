import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "../../lib/analyze-schematic-placement"
import { SchematicPlacementPipeline } from "../../lib/solvers/SchematicPlacementPipeline/SchematicPlacementPipeline"
import type { SchematicPlacementIssue } from "../../lib/types"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("runs only selected solvers and preserves shared-solver filtering and deduplication", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled>
      <capacitor name="C1" capacitance="100nF" schRotation={90} schX={-3} />
      <capacitor name="C2" capacitance="100nF" schRotation={0} schX={3} />
      <trace from=".C1 > .pin1" to="net.V3V3" />
      <trace from=".C1 > .pin2" to="net.GND" />
      <trace from=".C2 > .pin1" to="net.V3V3" />
      <trace from=".C2 > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const original = JSON.stringify(circuitJson)
  const all = analyzeSchematicPlacement(circuitJson)
  expect(all.getIssues().map((issue) => issue.lineItemType)).toEqual([
    "TwoPinComponentHasInvertedRails",
    "TwoPinComponentShouldBeVertical",
    "DecouplingCapacitorsNotCloseTogether",
  ])

  const inverted = ["TwoPinComponentHasInvertedRails"] as const
  const both = [...inverted, "TwoPinComponentShouldBeVertical"] as const
  const selections: readonly (readonly SchematicPlacementIssue["lineItemType"][])[] =
    [
      [],
      inverted,
      both,
      [...both, ...inverted],
      // The rail solver is a prerequisite for suppressing generic capacitor findings.
      ["CapacitorSymbolHorizontal"],
    ]
  for (const issueTypes of selections) {
    const selected = analyzeSchematicPlacement(circuitJson, { issueTypes })
    expect(selected.getIssues()).toEqual(all.getIssues({ issueTypes }))
  }

  const shared = new SchematicPlacementPipeline(circuitJson, {
    issueTypes: both,
  })
  shared.solve()
  expect(Object.keys(shared.startTimeOfStage)).toEqual([
    "TwoPinComponentRailOrientationSolver",
  ])
  const empty = new SchematicPlacementPipeline(circuitJson, { issueTypes: [] })
  empty.solve()
  expect(Object.keys(empty.startTimeOfStage)).toEqual([])
  expect(empty.getOutput().issues).toEqual([])

  for (const [name, issueTypes] of [
    ["inverted", inverted],
    ["both", both],
  ] as const) {
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson,
        analysis: analyzeSchematicPlacement(circuitJson, { issueTypes }),
        highlightIssues: true,
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
  expect(JSON.stringify(circuitJson)).toBe(original)
})
