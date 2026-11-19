import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  CapacitorOrientationSolver,
} from "lib/index"
import { buildSolverContext } from "lib/utils/placements"
import type { SchematicPlacementIssue } from "lib/types"
import { createFloatingChipCapacitor } from "../fixtures/floating-chip-capacitor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not prescribe a rail orientation for a floating chip-return capacitor", async () => {
  // "two-supplies" is a bootstrap capacitor: the host's output returns to the
  // same chip's supply input, as LM76005 SW and CBOOT do.
  for (const mode of ["floating", "two-supplies"] as const)
    for (const rotation of [0, 90, 180, 270]) {
      for (const reverse of [false, true]) {
        const circuitJson = await createFloatingChipCapacitor({
          mode,
          rotation,
          reverse,
        })
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
        expect(genericIssues).toHaveLength(0)
        const analysis = analyzeSchematicPlacement(circuitJson, {
          issueTypes: [
            "TwoPinComponentShouldBeVertical",
            "TwoPinComponentHasInvertedRails",
            "CapacitorSymbolHorizontal",
          ],
        })
        expect(analysis.getIssues()).toEqual([])
        expect(JSON.stringify(circuitJson)).toBe(original)
        // Keep one visual baseline; the assertions above cover every permutation.
        if (mode === "floating" && rotation === 0 && !reverse) {
          expect(
            createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
          ).toMatchSvgSnapshot(import.meta.path, "floating-0-false")
        }
      }
    }
})
