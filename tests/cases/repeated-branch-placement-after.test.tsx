import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema23Status } from "../assets/nema23-status"
import { createNema23StatusCompact } from "../assets/nema23-status-compact"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("manually compacts the NEMA23 branches without changing connectivity", async () => {
  const before = await createNema23Status()
  const after = await createNema23StatusCompact()
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
  // Every source record is unchanged, including all resistor/transistor nets.
  // Explicit ground labels affect only the schematic drawing.
  expect(
    after
      .filter((e) => e.type === "schematic_net_label" && e.text === "GND")
      .filter(
        (e) =>
          "anchor_position" in e &&
          e.anchor_position !== undefined &&
          Math.abs(e.anchor_position.y + 28.1) < 0.01,
      ),
  ).toHaveLength(3)
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
