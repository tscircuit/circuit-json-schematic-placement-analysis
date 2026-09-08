import { expect, test } from "bun:test"
import { createFeedbackNetworkScatteredCircuitJson } from "../assets/feedback-network-scattered"
import { createPullResistorsWrongSideCircuitJson } from "../assets/pull-resistors-wrong-side"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import { getReproSchematicComponent } from "../fixtures/placement-repro-assertions"

test("does not group support components across sheets, explicit groups, or ambiguous representations", async () => {
  for (const [kind, create] of [
    ["feedback", createFeedbackNetworkScatteredCircuitJson],
    ["pull", createPullResistorsWrongSideCircuitJson],
  ] as const) {
    for (const boundary of ["sheet", "group", "duplicate"] as const) {
      const circuitJson = await create()
      const resistor = getReproSchematicComponent(circuitJson, "R1")
      // Isolate schema boundary handling while retaining the rendered TSX geometry and connectivity.
      if (boundary === "sheet") resistor.schematic_sheet_id = "separate_sheet"
      if (boundary === "group") resistor.schematic_group_id = "separate_group"
      if (boundary === "duplicate")
        circuitJson.push({
          ...resistor,
          schematic_component_id: "duplicate_representation",
          center: { x: 8, y: 0 },
        })
      const { feedback, pulls } = inspectNetworkFixture(
        circuitJson,
        import.meta.path,
        `${kind}-${boundary}`,
      )
      expect(feedback).toEqual([])
      expect(
        pulls.map((issue) => issue.resistorSchematicBox.sourceComponentName),
      ).toEqual(kind === "pull" ? ["R2"] : [])
    }
  }
})
