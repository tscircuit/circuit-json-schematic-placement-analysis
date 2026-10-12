import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createKeyboardSwitchDiodeRepro } from "../assets/keyboard-switch-series-diodes"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("grouping the matrix diodes clears all twelve findings and preserves the complete circuit", async () => {
  const before = await createKeyboardSwitchDiodeRepro()
  const after = await createKeyboardSwitchDiodeRepro(true)
  expectReproRendered(after, 92)
  // Compare electrical records; generated source warnings contain render-specific IDs.
  const electricalRecords = (json: CircuitJson) =>
    json.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_trace",
        "source_net",
        "source_group",
        "source_component_internal_connection",
      ].includes(e.type),
    )
  expect(electricalRecords(after)).toEqual(electricalRecords(before))
  for (const component of before.filter((e) => e.type === "source_component")) {
    const original = getReproSchematicComponent(before, component.name!)
    const next = getReproSchematicComponent(after, component.name!)
    if (component.ftype === "simple_diode") {
      expect(next).toEqual({
        ...original,
        center: { x: original.center.x - 6, y: original.center.y + 3 },
        symbol_name: "diode_left",
      })
    } else {
      expect(next).toEqual(original)
    }
  }
  const baseline = analyzeSchematicPlacement(before)
  const analysis = analyzeSchematicPlacement(after)
  expect(baseline.getIssueCounts().SwitchMatrixDiodeSeparatedFromSwitch).toBe(
    12,
  )
  expect(analysis.getIssueCounts().SwitchMatrixDiodeSeparatedFromSwitch).toBe(0)
  // Rerouting can renumber schematic traces; compare the reported findings.
  expect(
    analysis.getIssues().map((i) => analysis.schematicIssuesToString(i)),
  ).toEqual(
    baseline
      .getIssues()
      .filter((i) => i.lineItemType !== "SwitchMatrixDiodeSeparatedFromSwitch")
      .map((i) => baseline.schematicIssuesToString(i)),
  )
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 2400,
      height: 1600,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
