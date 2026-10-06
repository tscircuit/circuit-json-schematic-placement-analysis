import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema23Status } from "../assets/nema23-status"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("aligns the NEMA23 branches by moving six components without changing connectivity", async () => {
  const before = await createNema23Status()
  const after = await createNema23Status({ alignedBranches: true })
  expectReproRendered(after, 13)
  // Renderer warnings contain transient instance IDs; all source circuit records must match.
  const sourceRecords = (json: CircuitJson) =>
    json.filter(
      (e) => e.type.startsWith("source_") && !e.type.endsWith("_warning"),
    )
  expect(sourceRecords(after)).toEqual(sourceRecords(before))
  for (const name of [
    "D_STATUS",
    "BZ1",
    "Q_BUZZER",
    "D_BUZZER",
    "R_BUZZER_GATE",
    "R_BUZZER_PD",
    "C_BUZZER",
  ])
    expect(getReproSchematicComponent(after, name)).toEqual(
      getReproSchematicComponent(before, name),
    )
  const analysis = analyzeSchematicPlacement(after)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1600,
      height: 1100,
      highlightIssues: ["RepeatedBranchesStaggered"],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
