import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  CapacitorOrientationSolver,
} from "lib/index"
import { buildSolverContext } from "lib/utils/placements"
import type { SchematicPlacementIssue } from "lib/types"
import { createFloatingChipCapacitor } from "../fixtures/floating-chip-capacitor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("retains capacitor orientation checks when rail or scope evidence rules out a local floating return", async () => {
  for (const mode of [
    "declared-power",
    "declared-ground",
    "voltage",
    "other-supply",
    "grounded",
    "other-group",
    "requires-only",
    "required-voltage",
    "extra-return",
    "do-not-connect",
  ] as const) {
    for (const rotation of [0, 180]) {
      for (const reverse of [false, true]) {
        const circuitJson = await createFloatingChipCapacitor({
          mode,
          rotation,
          reverse,
        })
        const capacitor = circuitJson.find(
          (e) =>
            e.type === "source_component" && e.ftype === "simple_capacitor",
        )
        if (!capacitor || capacitor.type !== "source_component")
          throw new Error("Missing rendered capacitor")
        const original = JSON.stringify(circuitJson)
        const genericIssues: SchematicPlacementIssue[] = []
        new CapacitorOrientationSolver({
          // Isolate semantic orientation from the independent inline-trace exemption.
          // Electrical connectivity remains in the unchanged source records.
          ctx: buildSolverContext(
            circuitJson.filter((e) => e.type !== "schematic_trace"),
          ),
          issues: genericIssues,
        }).solve()
        expect(genericIssues).toHaveLength(1)
        const analysis = analyzeSchematicPlacement(circuitJson, {
          issueTypes: ["TwoPinComponentShouldBeVertical"],
        })
        const issues = analysis
          .getIssues()
          .filter(
            (issue) =>
              issue.lineItemType === "TwoPinComponentShouldBeVertical" &&
              issue.schematicBox.sourceComponentId ===
                capacitor.source_component_id,
          )
        expect(issues).toHaveLength(1)
        expect(issues[0]).toMatchObject({
          railType: "power",
          suggestedRailFacingDirection: "up",
          deltaSchRotation: (rotation === 0) === !reverse ? 90 : -90,
        })
        expect(JSON.stringify(circuitJson)).toBe(original)
        // One explicit-rail visual complements the floating baseline.
        if (mode === "declared-power" && rotation === 0 && !reverse) {
          expect(
            createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
          ).toMatchSvgSnapshot(import.meta.path, mode)
        }
      }
    }
  }
})
